import "../../css/pages/home.css";
import { initApp } from "../app.js";
import { getLatestProperties, getAllProperties } from "../services/propertyService.js";
import { getImageUrl } from "../services/uploadService.js";
import { escapeHtml } from "../utils/dom.js";
import { formatCompactNumber, formatCurrency } from "../utils/formatters.js";

const LATEST_PROPERTIES_LIMIT = 6;
const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1200&q=80";

function getLatestPropertiesContainer() {
	return document.getElementById("latest-properties-list");
}

function getStatisticsContainer() {
	return document.getElementById("statistics-cards");
}

function getPropertyImagePath(property) {
	const images = Array.isArray(property?.property_images) ? [...property.property_images] : [];

	if (!images.length) {
		return null;
	}

	const coverImage = images.find((image) => image?.is_cover);

	if (coverImage?.storage_path) {
		return coverImage.storage_path;
	}

	const [firstImage] = images.sort((first, second) => {
		return Number(first?.sort_order || 0) - Number(second?.sort_order || 0);
	});

	return firstImage?.storage_path || null;
}

async function resolvePropertyImageUrl(property) {
	const imagePath = getPropertyImagePath(property);

	if (!imagePath) {
		return FALLBACK_IMAGE;
	}

	const imageResult = await getImageUrl(imagePath);

	if (imageResult.error || !imageResult.data) {
		return FALLBACK_IMAGE;
	}

	return imageResult.data;
}

function buildPropertyMeta(property) {
	const bedrooms = Number.isFinite(Number(property?.bedrooms)) ? `${property.bedrooms} bd` : null;
	const bathrooms = Number.isFinite(Number(property?.bathrooms)) ? `${property.bathrooms} ba` : null;
	const areaValue = Number.isFinite(Number(property?.area_value))
		? `${formatCompactNumber(property.area_value)} ${escapeHtml(property?.area_unit || "sq ft")}`
		: null;

	return [bedrooms, bathrooms, areaValue].filter(Boolean).join(" • ");
}

function buildPropertyLocation(property) {
	return [property?.locations?.city, property?.locations?.state_region, property?.locations?.country]
		.filter(Boolean)
		.map((value) => escapeHtml(value))
		.join(", ");
}

function buildPropertyCard(property, imageUrl) {
	const title = escapeHtml(property?.title || "Property");
	const location = buildPropertyLocation(property) || "Location coming soon";
	const meta = buildPropertyMeta(property) || "More details available soon";
	const typeName = escapeHtml(property?.property_types?.name || "Property");
	const description = escapeHtml(property?.description || "Explore this listing to see pricing, features, and neighborhood details.");
	const detailUrl = `/property-details.html?propertyId=${encodeURIComponent(property?.property_id || "")}`;

	return `
		<div class="col-12 col-md-6 col-xl-4">
			<article class="card property-card h-100 border-0 shadow-sm overflow-hidden">
				<img src="${imageUrl}" class="property-card__image" alt="${title}" />
				<div class="card-body d-flex flex-column p-4">
					<div class="d-flex justify-content-between align-items-start gap-3 mb-3">
						<span class="badge text-bg-light border property-card__badge">${typeName}</span>
						<strong class="property-card__price">${formatCurrency(property?.price_amount, property?.currency_code)}</strong>
					</div>
					<h3 class="h4 card-title mb-2">${title}</h3>
					<p class="text-secondary mb-2">${location}</p>
					<p class="small text-uppercase text-secondary fw-semibold letter-spacing-wide mb-3">${meta}</p>
					<p class="card-text text-secondary flex-grow-1">${description}</p>
					<a class="btn btn-outline-dark mt-3 align-self-start" href="${detailUrl}">View Details</a>
				</div>
			</article>
		</div>
	`;
}

function renderLatestPropertiesLoading() {
	const container = getLatestPropertiesContainer();

	if (!container) {
		return;
	}

	container.innerHTML = `
		<div class="col-12">
			<div class="alert alert-light border mb-0" role="status">Loading latest properties...</div>
		</div>
	`;
}

function renderLatestPropertiesError(message) {
	const container = getLatestPropertiesContainer();

	if (!container) {
		return;
	}

	container.innerHTML = `
		<div class="col-12">
			<div class="alert alert-warning mb-0" role="alert">${escapeHtml(message)}</div>
		</div>
	`;
}

function renderLatestPropertiesEmpty() {
	const container = getLatestPropertiesContainer();

	if (!container) {
		return;
	}

	container.innerHTML = `
		<div class="col-12">
			<div class="alert alert-secondary mb-0" role="status">No properties are available yet. Check back soon for new listings.</div>
		</div>
	`;
}

async function renderLatestProperties(properties) {
	const container = getLatestPropertiesContainer();

	if (!container) {
		return;
	}

	const cards = await Promise.all(properties.map(async (property) => {
		const imageUrl = await resolvePropertyImageUrl(property);
		return buildPropertyCard(property, imageUrl);
	}));

	container.innerHTML = cards.join("");
}

function buildStatistics(allProperties, latestProperties) {
	const cityCount = new Set(
		allProperties
			.map((property) => property?.locations?.city)
			.filter(Boolean)
	).size;
	const publishedCount = allProperties.filter((property) => {
		return property?.listing_statuses?.name === "published";
	}).length;
	const averagePrice = allProperties.length
		? allProperties.reduce((total, property) => total + Number(property?.price_amount || 0), 0) / allProperties.length
		: 0;
	const newestCities = new Set(
		latestProperties
			.map((property) => property?.locations?.city)
			.filter(Boolean)
	).size;

	return [
		{
			value: formatCompactNumber(allProperties.length),
			label: "Properties tracked"
		},
		{
			value: formatCompactNumber(publishedCount),
			label: "Published listings"
		},
		{
			value: formatCurrency(averagePrice || 0, allProperties[0]?.currency_code || "USD"),
			label: "Average asking price"
		},
		{
			value: formatCompactNumber(cityCount || newestCities),
			label: "Cities covered"
		}
	];
}

function renderStatistics(cards) {
	const container = getStatisticsContainer();

	if (!container) {
		return;
	}

	container.innerHTML = cards.map((card) => {
		return `
			<div class="col-6">
				<article class="stat-card h-100">
					<p class="stat-card__value">${escapeHtml(card.value)}</p>
					<p class="stat-card__label mb-0">${escapeHtml(card.label)}</p>
				</article>
			</div>
		`;
	}).join("");
}

async function loadHomePage() {
	renderLatestPropertiesLoading();

	const [latestPropertiesResult, allPropertiesResult] = await Promise.all([
		getLatestProperties(LATEST_PROPERTIES_LIMIT),
		getAllProperties()
	]);

	if (latestPropertiesResult.error) {
		renderLatestPropertiesError(latestPropertiesResult.error);
	} else if (!latestPropertiesResult.data.length) {
		renderLatestPropertiesEmpty();
	} else {
		await renderLatestProperties(latestPropertiesResult.data);
	}

	const statisticsCards = buildStatistics(
		allPropertiesResult.data || [],
		latestPropertiesResult.data || []
	);

	renderStatistics(statisticsCards);
}

async function bootstrapHomePage() {
	await initApp();
	await loadHomePage();
}

bootstrapHomePage();
