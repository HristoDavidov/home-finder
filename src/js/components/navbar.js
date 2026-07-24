import { supabaseClient } from "../config/supabase.js";
import { getCurrentUser, logout } from "../services/authService.js";

const ADMIN_ROLE_NAME = "admin";
const NAVBAR_ID = "homefinder-navbar";
const BRAND_LABEL = "HomeFinder";
const GUEST_PRIMARY_LINKS = [
	{ label: "Home", href: "/index.html" },
	{ label: "Properties", href: "/listings.html" }
];
const GUEST_SECONDARY_LINKS = [
	{ label: "Login", href: "/login.html" },
	{ label: "Register", href: "/register.html" }
];
const AUTHENTICATED_PRIMARY_LINKS = [
	{ label: "Home", href: "/index.html" },
	{ label: "Properties", href: "/listings.html" },
	{ label: "Create Property", href: "/create-property.html" },
	{ label: "Favorites", href: "/favorites.html" }
];
const AUTHENTICATED_SECONDARY_LINKS = [
	{ label: "Profile", href: "/profile.html" }
];
const ADMIN_LINKS = [
	{ label: "Dashboard", href: "/dashboard.html" },
	{ label: "Manage Users", href: "/manage-users.html" },
	{ label: "Manage Properties", href: "/manage-properties.html" }
];

function getCurrentPathname() {
	const pathname = window.location.pathname || "/index.html";

	if (pathname === "/") {
		return "/index.html";
	}

	return pathname.toLowerCase();
}

function isActiveLink(href) {
	return getCurrentPathname() === href.toLowerCase();
}

function renderNavLink(link) {
	const activeClass = isActiveLink(link.href) ? " active" : "";
	const ariaCurrent = isActiveLink(link.href) ? ' aria-current="page"' : "";

	return `
		<li class="nav-item">
			<a class="nav-link${activeClass}" href="${link.href}"${ariaCurrent}>${link.label}</a>
		</li>
	`;
}

function renderLogoutButton() {
	return `
		<li class="nav-item">
			<button class="nav-link nav-link-button" type="button" data-logout-trigger="true">
				Logout
			</button>
		</li>
	`;
}

async function getAdminStatus(userId) {
	if (!supabaseClient || !userId) {
		return false;
	}

	const { data, error } = await supabaseClient
		.from("user_roles")
		.select("role_id, roles!inner(role_name)")
		.eq("user_id", userId)
		.eq("roles.role_name", ADMIN_ROLE_NAME)
		.limit(1)
		.maybeSingle();

	if (error) {
		return false;
	}

	return Boolean(data);
}

async function getNavigationState() {
	const userResult = await getCurrentUser();

	if (userResult.error || !userResult.user) {
		return {
			isAuthenticated: false,
			isAdmin: false
		};
	}

	return {
		isAuthenticated: true,
		isAdmin: await getAdminStatus(userResult.user.id)
	};
}

function buildNavbarMarkup({ isAuthenticated, isAdmin }) {
	const primaryLinks = isAuthenticated
		? [...AUTHENTICATED_PRIMARY_LINKS, ...(isAdmin ? ADMIN_LINKS : [])]
		: GUEST_PRIMARY_LINKS;
	const secondaryLinks = isAuthenticated
		? AUTHENTICATED_SECONDARY_LINKS
		: GUEST_SECONDARY_LINKS;
	const secondaryMarkup = secondaryLinks.map(renderNavLink).join("");
	const logoutMarkup = isAuthenticated ? renderLogoutButton() : "";

	return `
		<nav id="${NAVBAR_ID}" class="navbar navbar-expand-lg homefinder-navbar sticky-top" aria-label="Primary">
			<div class="container">
				<a class="navbar-brand homefinder-navbar__brand" href="/index.html">${BRAND_LABEL}</a>
				<button
					class="navbar-toggler"
					type="button"
					data-bs-toggle="collapse"
					data-bs-target="#homefinder-navbar-collapse"
					aria-controls="homefinder-navbar-collapse"
					aria-expanded="false"
					aria-label="Toggle navigation"
				>
					<span class="navbar-toggler-icon"></span>
				</button>
				<div class="collapse navbar-collapse" id="homefinder-navbar-collapse">
					<ul class="navbar-nav me-auto mb-2 mb-lg-0">
						${primaryLinks.map(renderNavLink).join("")}
					</ul>
					<ul class="navbar-nav ms-lg-auto mb-2 mb-lg-0 align-items-lg-center">
						${secondaryMarkup}
						${logoutMarkup}
					</ul>
				</div>
			</div>
		</nav>
	`;
}

function attachLogoutHandler(navbarElement) {
	const logoutTrigger = navbarElement.querySelector("[data-logout-trigger='true']");

	if (!logoutTrigger) {
		return;
	}

	logoutTrigger.addEventListener("click", async () => {
		const result = await logout();

		if (result.error) {
			window.alert(result.error);
			return;
		}

		window.location.href = "/index.html";
	});
}

export async function initNavbar() {
	const existingNavbar = document.getElementById(NAVBAR_ID);

	if (existingNavbar) {
		existingNavbar.remove();
	}

	const navigationState = await getNavigationState();
	document.body.insertAdjacentHTML("afterbegin", buildNavbarMarkup(navigationState));

	const navbarElement = document.getElementById(NAVBAR_ID);

	if (navbarElement) {
		attachLogoutHandler(navbarElement);
	}
}
