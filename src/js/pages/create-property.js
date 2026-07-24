import "../../css/pages/create-property.css";
import { initApp } from "../app.js";
import { getCurrentUser } from "../services/authService.js";
import {
  createLocation,
  createProperty,
  createPropertyImage,
  getListingStatusByName,
  getPropertyTypes
} from "../services/propertyService.js";
import { deleteImage, uploadPropertyImage } from "../services/uploadService.js";
import { escapeHtml } from "../utils/dom.js";

function getElements() {
  return {
    form: document.getElementById("create-property-form"),
    feedback: document.getElementById("create-property-feedback"),
    propertyType: document.getElementById("property-type"),
    submitButton: document.getElementById("create-property-submit"),
    priceField: document.getElementById("property-price"),
    areaField: document.getElementById("property-area"),
    roomsField: document.getElementById("property-rooms")
  };
}

function renderFeedback(message, variant = "light") {
  const { feedback } = getElements();

  if (!feedback) {
    return;
  }

  feedback.innerHTML = `
    <div class="alert alert-${variant} border mb-0" role="status">${escapeHtml(message)}</div>
  `;
}

function clearFeedback() {
  const { feedback } = getElements();

  if (feedback) {
    feedback.innerHTML = "";
  }
}

function setSubmittingState(isSubmitting) {
  const { submitButton, form } = getElements();

  if (submitButton) {
    submitButton.disabled = isSubmitting;
    submitButton.textContent = isSubmitting ? "Creating..." : "Create Property";
  }

  if (form) {
    form.querySelectorAll("input, textarea, select, button").forEach((element) => {
      if (element !== submitButton) {
        element.disabled = isSubmitting;
      }
    });
  }
}

function setFieldError(fieldName, message) {
  const field = document.querySelector(`[name='${fieldName}']`);
  const customError = document.querySelector(`[data-error-for='${fieldName}']`);

  if (field) {
    field.classList.add("is-invalid");
  }

  if (customError) {
    customError.textContent = message;
  }
}

function clearFieldErrors() {
  document.querySelectorAll(".is-invalid").forEach((field) => field.classList.remove("is-invalid"));
  document.querySelectorAll("[data-error-for]").forEach((element) => {
    element.textContent = "";
  });
}

function validateForm(form) {
  clearFieldErrors();
  let isValid = true;

  if (!form.reportValidity()) {
    isValid = false;
  }

  const formData = new FormData(form);
  const price = Number(formData.get("price"));
  const area = Number(formData.get("area"));
  const rooms = Number(formData.get("rooms"));
  const imageFile = formData.get("image");

  if (!Number.isFinite(price) || price <= 0) {
    setFieldError("price", "Price must be greater than zero.");
    isValid = false;
  }

  if (!Number.isFinite(area) || area <= 0) {
    setFieldError("area", "Area must be greater than zero.");
    isValid = false;
  }

  if (!Number.isInteger(rooms) || rooms <= 0) {
    setFieldError("rooms", "Rooms must be a whole number greater than zero.");
    isValid = false;
  }

  if (!(imageFile instanceof File) || !imageFile.size) {
    const imageField = document.getElementById("property-image");

    if (imageField) {
      imageField.classList.add("is-invalid");
    }

    isValid = false;
  }

  return isValid;
}

function populatePropertyTypes(propertyTypes) {
  const { propertyType } = getElements();

  if (!propertyType) {
    return;
  }

  propertyType.innerHTML = [
    '<option value="">Select property type</option>',
    ...propertyTypes.map((type) => {
      return `<option value="${type.property_type_id}">${escapeHtml(type.name)}</option>`;
    })
  ].join("");
}

async function ensureAuthenticated() {
  const currentUserResult = await getCurrentUser();

  if (currentUserResult.error || !currentUserResult.user) {
    renderFeedback("Please log in before creating a property.", "warning");
    const { form } = getElements();

    if (form) {
      form.classList.add("d-none");
    }

    return false;
  }

  return true;
}

async function loadPropertyTypes() {
  const propertyTypesResult = await getPropertyTypes();

  if (propertyTypesResult.error) {
    renderFeedback(propertyTypesResult.error, "warning");
    return false;
  }

  populatePropertyTypes(propertyTypesResult.data || []);
  return true;
}

async function createPropertyListing(form) {
  const formData = new FormData(form);
  const imageFile = formData.get("image");
  let uploadedImagePath = null;

  try {
    const publishedStatusResult = await getListingStatusByName("published");

    if (publishedStatusResult.error || !publishedStatusResult.data?.status_id) {
      throw new Error(publishedStatusResult.error || "Published status could not be found.");
    }

    const uploadResult = await uploadPropertyImage(imageFile, "properties");

    if (uploadResult.error || !uploadResult.data?.path) {
      throw new Error(uploadResult.error || "Property image upload failed.");
    }

    uploadedImagePath = uploadResult.data.path;

    const locationResult = await createLocation({
      country: "Bulgaria",
      city: String(formData.get("city") || "").trim(),
      address_line: String(formData.get("address") || "").trim()
    });

    if (locationResult.error || !locationResult.data?.location_id) {
      throw new Error(locationResult.error || "Location could not be created.");
    }

    const propertyResult = await createProperty({
      location_id: locationResult.data.location_id,
      property_type_id: Number(formData.get("propertyType")),
      status_id: publishedStatusResult.data.status_id,
      title: String(formData.get("title") || "").trim(),
      description: String(formData.get("description") || "").trim(),
      price_amount: Number(formData.get("price")),
      currency_code: "USD",
      bedrooms: Number(formData.get("rooms")),
      area_value: Number(formData.get("area")),
      area_unit: "sq ft",
      published_at: new Date().toISOString()
    });

    if (propertyResult.error || !propertyResult.data?.property_id) {
      throw new Error(propertyResult.error || "Property could not be created.");
    }

    const propertyImageResult = await createPropertyImage({
      property_id: propertyResult.data.property_id,
      storage_bucket: uploadResult.data.bucket,
      storage_path: uploadResult.data.path,
      alt_text: String(formData.get("title") || "").trim(),
      sort_order: 1,
      is_cover: true
    });

    if (propertyImageResult.error) {
      throw new Error(propertyImageResult.error);
    }

    return propertyResult.data.property_id;
  } catch (error) {
    if (uploadedImagePath) {
      await deleteImage(uploadedImagePath);
    }

    throw error;
  }
}

async function handleSubmit(event) {
  event.preventDefault();
  const { form } = getElements();

  if (!form || !validateForm(form)) {
    return;
  }

  clearFeedback();
  setSubmittingState(true);

  try {
    const propertyId = await createPropertyListing(form);
    renderFeedback("Property created successfully. Redirecting...", "success");
    form.reset();
    window.location.href = `/property-details.html?propertyId=${encodeURIComponent(propertyId)}`;
  } catch (error) {
    renderFeedback(error.message || "Property creation failed. Please try again.", "warning");
  } finally {
    setSubmittingState(false);
  }
}

async function bootstrapCreatePropertyPage() {
  await initApp();

  const isAuthenticated = await ensureAuthenticated();

  if (!isAuthenticated) {
    return;
  }

  const propertyTypesLoaded = await loadPropertyTypes();

  if (!propertyTypesLoaded) {
    return;
  }

  const { form } = getElements();

  if (form) {
    form.addEventListener("submit", handleSubmit);
  }
}

bootstrapCreatePropertyPage();