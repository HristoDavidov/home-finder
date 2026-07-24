import "../../css/pages/listings.css";
import { initApp } from "../app.js";
import { getAllProperties } from "../services/propertyService.js";
import { getImageUrl } from "../services/uploadService.js";
import { escapeHtml } from "../utils/dom.js";
import { formatCompactNumber, formatCurrency } from "../utils/formatters.js";

const FALLBACK_IMAGE = "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80";

const catalogState = {
	properties: [],
	enrichedProperties: [],
	filters: {
		search: "",
		city: "",
		type: "",
		sort: "newest"
	}
};

function getCatalogElements() {
	return {
		list: document.getElementById("properties-catalog-list"),
		searchInput: document.getElementById("search-input"),
		cityFilter: document.getElementById("city-filter"),
		typeFilter: document.getElementById("type-filter"),
		priceSort: document.getElementById("price-sort"),
		totalCount: document.getElementById("properties-total-count"),
		activeFilters: document.getElementById("properties-active-filters")
	};
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

function normalizeValue(value) {
	return String(value || "").trim().toLowerCase();
}

function getPropertyArea(property) {
	if (!Number.isFinite(Number(property?.area_value))) {
		return "Area not listed";
	}

	return `${formatCompactNumber(property.area_value)} ${escapeHtml(property?.area_unit || "sq ft")}`;
}

function getPropertyCity(property) {
	return property?.locations?.city || "City unavailable";
}

function buildPropertyCard(property) {
	const title = escapeHtml(property?.title || "Property");
	const city = escapeHtml(getPropertyCity(property));
	const price = formatCurrency(property?.price_amount, property?.currency_code);
	const area = getPropertyArea(property);
	const detailUrl = `/property-details.html?propertyId=${encodeURIComponent(property?.property_id || "")}`;
	const typeName = escapeHtml(property?.property_types?.name || "Property");

	return `
		<div class="col-12 col-md-6 col-xl-4">
			<article class="card catalog-card h-100 border-0 shadow-sm overflow-hidden">
				<img src="${property.imageUrl}" class="catalog-card__image" alt="${title}" />
				<div class="card-body p-4 d-flex flex-column">
					<div class="d-flex justify-content-between align-items-start gap-3 mb-3">
						<span class="badge text-bg-light border catalog-card__badge">${typeName}</span>
						<strong class="catalog-card__price">${price}</strong>
					</div>
					<h2 class="h4 mb-2">${title}</h2>
					<p class="text-secondary mb-2">${city}</p>
					<p class="small text-uppercase fw-semibold text-secondary mb-4 catalog-card__area">${area}</p>
					<a class="btn btn-outline-dark mt-auto align-self-start" href="${detailUrl}">Details</a>
				</div>
			</article>
		</div>
	`;
}

function renderCatalogMessage(message, variant = "light") {
	const { list } = getCatalogElements();

	if (!list) {
		return;
	}

	list.innerHTML = `
		<div class="col-12">
			<div class="alert alert-${variant} border mb-0" role="status">${escapeHtml(message)}</div>
		</div>
	`;
}

function populateSelectOptions(selectElement, values, defaultLabel) {
	if (!selectElement) {
		return;
	}

	selectElement.innerHTML = [
		`<option value="">${defaultLabel}</option>`,
		...values.map((value) => `<option value="${escapeHtml(value)}">${escapeHtml(value)}</option>`)
	].join("");
}

function updateSummary(filteredProperties) {
	const { totalCount, activeFilters } = getCatalogElements();

	if (totalCount) {
		totalCount.textContent = `${filteredProperties.length} ${filteredProperties.length === 1 ? "property" : "properties"}`;
	}

	if (activeFilters) {
		const activeParts = [];

		if (catalogState.filters.search) {
			activeParts.push(`Search: ${catalogState.filters.search}`);
		}

		if (catalogState.filters.city) {
			activeParts.push(`City: ${catalogState.filters.city}`);
		}

		if (catalogState.filters.type) {
			activeParts.push(`Type: ${catalogState.filters.type}`);
		}

		activeFilters.textContent = activeParts.length
			? activeParts.join(" | ")
			: "Showing all available properties";
	}
}

function applyFilters() {
	const searchTerm = normalizeValue(catalogState.filters.search);
	const cityFilter = normalizeValue(catalogState.filters.city);
	const typeFilter = normalizeValue(catalogState.filters.type);

	const filteredProperties = catalogState.enrichedProperties.filter((property) => {
		const title = normalizeValue(property?.title);
		const city = normalizeValue(property?.locations?.city);
		const area = normalizeValue(property?.area_unit);
		const propertyType = normalizeValue(property?.property_types?.name);
		const matchesSearch = !searchTerm
			|| title.includes(searchTerm)
			|| city.includes(searchTerm)
			|| area.includes(searchTerm);
		const matchesCity = !cityFilter || city === cityFilter;
		const matchesType = !typeFilter || propertyType === typeFilter;

		return matchesSearch && matchesCity && matchesType;
	});

	filteredProperties.sort((first, second) => {
		if (catalogState.filters.sort === "price-asc") {
			return Number(first?.price_amount || 0) - Number(second?.price_amount || 0);
		}

		if (catalogState.filters.sort === "price-desc") {
			return Number(second?.price_amount || 0) - Number(first?.price_amount || 0);
		}

		return new Date(second?.created_at || 0).getTime() - new Date(first?.created_at || 0).getTime();
	});

	return filteredProperties;
}

function renderFilteredProperties() {
	const { list } = getCatalogElements();

	if (!list) {
		return;
	}

	const filteredProperties = applyFilters();
	updateSummary(filteredProperties);

	if (!filteredProperties.length) {
		renderCatalogMessage("No properties match the current filters.", "secondary");
		return;
	}

	list.innerHTML = filteredProperties.map(buildPropertyCard).join("");
}

function bindFilters() {
	const { searchInput, cityFilter, typeFilter, priceSort } = getCatalogElements();

	if (searchInput) {
		searchInput.addEventListener("input", (event) => {
			catalogState.filters.search = event.target.value;
			renderFilteredProperties();
		});
	}

	if (cityFilter) {
		cityFilter.addEventListener("change", (event) => {
			catalogState.filters.city = event.target.value;
			renderFilteredProperties();
		});
	}

	if (typeFilter) {
		typeFilter.addEventListener("change", (event) => {
			catalogState.filters.type = event.target.value;
			renderFilteredProperties();
		});
	}

	if (priceSort) {
		priceSort.addEventListener("change", (event) => {
			catalogState.filters.sort = event.target.value;
			renderFilteredProperties();
		});
	}
}

async function enrichProperties(properties) {
	return Promise.all(properties.map(async (property) => {
		return {
			...property,
			imageUrl: await resolvePropertyImageUrl(property)
		};
	}));
}

function populateFilters(properties) {
	const { cityFilter, typeFilter } = getCatalogElements();
	const cities = [...new Set(properties.map((property) => property?.locations?.city).filter(Boolean))]
		.sort((first, second) => first.localeCompare(second));
	const types = [...new Set(properties.map((property) => property?.property_types?.name).filter(Boolean))]
		.sort((first, second) => first.localeCompare(second));

	populateSelectOptions(cityFilter, cities, "All cities");
	populateSelectOptions(typeFilter, types, "All types");
}

async function loadCatalogPage() {
	renderCatalogMessage("Loading properties...", "light");

	const propertiesResult = await getAllProperties();

	if (propertiesResult.error) {
		renderCatalogMessage(propertiesResult.error, "warning");
		return;
	}

	catalogState.properties = propertiesResult.data || [];
	catalogState.enrichedProperties = await enrichProperties(catalogState.properties);
	populateFilters(catalogState.enrichedProperties);
	renderFilteredProperties();
}

async function bootstrapListingsPage() {
	await initApp();
	bindFilters();
	await loadCatalogPage();
}

bootstrapListingsPage();
