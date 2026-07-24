import "../../css/pages/property-details.css";
import { initApp } from "../app.js";
import { getCurrentUser } from "../services/authService.js";
import { addFavorite, isFavorite, removeFavorite } from "../services/favoriteService.js";
import { deleteProperty, getPropertyById } from "../services/propertyService.js";
import { getImageUrl } from "../services/uploadService.js";
import { escapeHtml } from "../utils/dom.js";
import { formatCompactNumber, formatCurrency } from "../utils/formatters.js";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1400&q=80";

const pageState = {
	property: null,
	currentUser: null,
	isFavorite: false
};

function getPropertyIdFromUrl() {
	const searchParams = new URLSearchParams(window.location.search);
	return searchParams.get("propertyId");
}

function getElements() {
	return {
		feedback: document.getElementById("property-details-feedback"),
		content: document.getElementById("property-details-content"),
		galleryInner: document.getElementById("property-gallery-inner"),
		galleryThumbs: document.getElementById("property-gallery-thumbs"),
		badges: document.getElementById("property-badges"),
		title: document.getElementById("property-title"),
		location: document.getElementById("property-location"),
		price: document.getElementById("property-price"),
		facts: document.getElementById("property-facts"),
		description: document.getElementById("property-description"),
		ownerName: document.getElementById("owner-name"),
		ownerPhone: document.getElementById("owner-phone"),
		ownerAvatar: document.getElementById("owner-avatar"),
		mapPlaceholder: document.getElementById("map-placeholder"),
		favoriteButton: document.getElementById("favorite-button"),
		ownerActions: document.getElementById("owner-actions"),
		editButton: document.getElementById("edit-property-button"),
		deleteButton: document.getElementById("delete-property-button")
	};
}

function renderFeedback(message, variant = "light") {
	const { feedback, content } = getElements();

	if (!feedback || !content) {
		return;
	}

	feedback.innerHTML = `
		<div class="alert alert-${variant} border mb-0" role="status">${escapeHtml(message)}</div>
	`;
	content.classList.add("d-none");
}

function clearFeedback() {
	const { feedback } = getElements();

	if (feedback) {
		feedback.innerHTML = "";
	}
}

function buildLocation(property) {
	return [property?.locations?.city, property?.locations?.state_region, property?.locations?.country]
		.filter(Boolean)
		.map((value) => escapeHtml(value))
		.join(", ");
}

function buildFact(label, value) {
	return `
		<div class="col-6 col-md-4">
			<article class="fact-tile h-100">
				<p class="fact-tile__label mb-1">${escapeHtml(label)}</p>
				<p class="fact-tile__value mb-0">${escapeHtml(value)}</p>
			</article>
		</div>
	`;
}

function getPropertyImagePath(property) {
	const images = Array.isArray(property?.property_images) ? [...property.property_images] : [];

	if (!images.length) {
		return [];
	}

	return images
		.sort((first, second) => Number(first?.sort_order || 0) - Number(second?.sort_order || 0))
		.map((image) => image?.storage_path)
		.filter(Boolean);
}

async function resolveGalleryImages(property) {
	const imagePaths = getPropertyImagePath(property);

	if (!imagePaths.length) {
		return [{
			url: FALLBACK_IMAGE,
			alt: property?.title || "Property"
		}];
	}

	const galleryImages = await Promise.all(imagePaths.map(async (imagePath, index) => {
		const imageResult = await getImageUrl(imagePath);

		return {
			url: imageResult.error || !imageResult.data ? FALLBACK_IMAGE : imageResult.data,
			alt: `${property?.title || "Property"} image ${index + 1}`
		};
	}));

	return galleryImages;
}

function renderGallery(images) {
	const { galleryInner, galleryThumbs } = getElements();

	if (!galleryInner || !galleryThumbs) {
		return;
	}

	galleryInner.innerHTML = images.map((image, index) => {
		return `
			<div class="carousel-item${index === 0 ? " active" : ""}">
				<img src="${image.url}" class="d-block w-100 details-gallery__image" alt="${escapeHtml(image.alt)}" />
			</div>
		`;
	}).join("");

	galleryThumbs.innerHTML = images.map((image, index) => {
		return `
			<button class="details-gallery__thumb${index === 0 ? " is-active" : ""}" type="button" data-bs-target="#property-gallery" data-bs-slide-to="${index}" aria-label="View image ${index + 1}">
				<img src="${image.url}" alt="${escapeHtml(image.alt)}" />
			</button>
		`;
	}).join("");

	const thumbButtons = galleryThumbs.querySelectorAll(".details-gallery__thumb");

	thumbButtons.forEach((button) => {
		button.addEventListener("click", () => {
			thumbButtons.forEach((thumbButton) => thumbButton.classList.remove("is-active"));
			button.classList.add("is-active");
		});
	});
}

function renderBadges(property) {
	const { badges } = getElements();

	if (!badges) {
		return;
	}

	const badgeItems = [
		property?.property_types?.name,
		property?.listing_statuses?.name,
		property?.year_built ? `Built ${property.year_built}` : null
	].filter(Boolean);

	badges.innerHTML = badgeItems.map((item) => {
		return `<span class="badge rounded-pill text-bg-light border details-badge">${escapeHtml(item)}</span>`;
	}).join("");
}

function renderFacts(property) {
	const { facts } = getElements();

	if (!facts) {
		return;
	}

	const factItems = [
		["Bedrooms", Number.isFinite(Number(property?.bedrooms)) ? String(property.bedrooms) : "N/A"],
		["Bathrooms", Number.isFinite(Number(property?.bathrooms)) ? String(property.bathrooms) : "N/A"],
		["Parking", Number.isFinite(Number(property?.parking_spaces)) ? String(property.parking_spaces) : "N/A"],
		["Area", Number.isFinite(Number(property?.area_value)) ? `${formatCompactNumber(property.area_value)} ${property?.area_unit || "sq ft"}` : "N/A"],
		["Type", property?.property_types?.name || "N/A"],
		["Status", property?.listing_statuses?.name || "N/A"]
	];

	facts.innerHTML = factItems.map(([label, value]) => buildFact(label, value)).join("");
}

function renderOwner(property) {
	const { ownerName, ownerPhone, ownerAvatar } = getElements();
	const ownerProfile = property?.profiles;
	const displayName = ownerProfile?.display_name || "Property owner";
	const phone = ownerProfile?.phone || "Phone not provided";
	const avatarMarkup = ownerProfile?.avatar_url
		? `<img src="${ownerProfile.avatar_url}" alt="${escapeHtml(displayName)}" class="owner-card__avatar-image" />`
		: `<span>${escapeHtml(displayName.charAt(0).toUpperCase())}</span>`;

	if (ownerName) {
		ownerName.textContent = displayName;
	}

	if (ownerPhone) {
		ownerPhone.textContent = phone;
	}

	if (ownerAvatar) {
		ownerAvatar.innerHTML = avatarMarkup;
	}
}

function renderMapPlaceholder(property) {
	const { mapPlaceholder } = getElements();

	if (!mapPlaceholder) {
		return;
	}

	const location = buildLocation(property) || "Location unavailable";
	const latitude = property?.locations?.latitude;
	const longitude = property?.locations?.longitude;
	const coordinates = Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))
		? `Coordinates: ${latitude}, ${longitude}`
		: "Map integration placeholder";

	mapPlaceholder.innerHTML = `
		<div>
			<p class="map-placeholder__title mb-2">${location}</p>
			<p class="mb-0 text-secondary">${coordinates}</p>
		</div>
	`;
}

function renderPropertySummary(property) {
	const { content, title, location, price, description, editButton } = getElements();

	if (content) {
		content.classList.remove("d-none");
	}

	if (title) {
		title.textContent = property?.title || "Property";
	}

	if (location) {
		location.textContent = [property?.locations?.city, property?.locations?.state_region, property?.locations?.country]
			.filter(Boolean)
			.join(", ") || "Location unavailable";
	}

	if (price) {
		price.textContent = formatCurrency(property?.price_amount, property?.currency_code);
	}

	if (description) {
		description.textContent = property?.description || "Property details will appear here when available.";
	}

	if (editButton) {
		editButton.href = `/create-property.html?propertyId=${encodeURIComponent(property?.property_id || "")}`;
	}

	renderBadges(property);
	renderFacts(property);
	renderOwner(property);
	renderMapPlaceholder(property);
}

function updateFavoriteButton() {
	const { favoriteButton } = getElements();

	if (!favoriteButton) {
		return;
	}

	if (!pageState.currentUser) {
		favoriteButton.className = "btn btn-outline-danger";
		favoriteButton.textContent = "Login to save";
		return;
	}

	favoriteButton.className = pageState.isFavorite ? "btn btn-danger" : "btn btn-outline-danger";
	favoriteButton.textContent = pageState.isFavorite ? "Saved to favorites" : "Save to favorites";
}

function renderOwnerActions() {
	const { ownerActions } = getElements();

	if (!ownerActions || !pageState.property) {
		return;
	}

	const isOwner = Boolean(pageState.currentUser?.id) && pageState.currentUser.id === pageState.property.owner_user_id;
	ownerActions.classList.toggle("d-none", !isOwner);
}

async function loadFavoriteState() {
	if (!pageState.currentUser || !pageState.property?.property_id) {
		pageState.isFavorite = false;
		updateFavoriteButton();
		return;
	}

	const favoriteResult = await isFavorite(pageState.property.property_id);
	pageState.isFavorite = !favoriteResult.error && Boolean(favoriteResult.data);
	updateFavoriteButton();
}

async function handleFavoriteToggle() {
	if (!pageState.property?.property_id) {
		return;
	}

	if (!pageState.currentUser) {
		window.alert("Please log in to save favorites.");
		return;
	}

	const actionResult = pageState.isFavorite
		? await removeFavorite(pageState.property.property_id)
		: await addFavorite(pageState.property.property_id);

	if (actionResult.error) {
		window.alert(actionResult.error);
		return;
	}

	pageState.isFavorite = !pageState.isFavorite;
	updateFavoriteButton();
}

async function handleDeleteProperty() {
	if (!pageState.property?.property_id) {
		return;
	}

	const confirmed = window.confirm("Delete this property? This action cannot be undone.");

	if (!confirmed) {
		return;
	}

	const deleteResult = await deleteProperty(pageState.property.property_id);

	if (deleteResult.error) {
		window.alert(deleteResult.error);
		return;
	}

	window.location.href = "/listings.html";
}

function bindActions() {
	const { favoriteButton, deleteButton } = getElements();

	if (favoriteButton) {
		favoriteButton.addEventListener("click", handleFavoriteToggle);
	}

	if (deleteButton) {
		deleteButton.addEventListener("click", handleDeleteProperty);
	}
}

async function loadPropertyDetails() {
	const propertyId = getPropertyIdFromUrl();

	if (!propertyId) {
		renderFeedback("A property ID is required to view property details.", "warning");
		return;
	}

	renderFeedback("Loading property details...");

	const [propertyResult, currentUserResult] = await Promise.all([
		getPropertyById(propertyId),
		getCurrentUser()
	]);

	pageState.currentUser = currentUserResult.user;

	if (propertyResult.error || !propertyResult.data) {
		renderFeedback(propertyResult.error || "Property not found.", "warning");
		return;
	}

	pageState.property = propertyResult.data;

	const galleryImages = await resolveGalleryImages(pageState.property);

	clearFeedback();
	renderPropertySummary(pageState.property);
	renderGallery(galleryImages);
	renderOwnerActions();
	await loadFavoriteState();
}

async function bootstrapPropertyDetailsPage() {
	await initApp();
	bindActions();
	await loadPropertyDetails();
}

bootstrapPropertyDetailsPage();
