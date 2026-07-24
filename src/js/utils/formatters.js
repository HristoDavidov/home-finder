export function formatCurrency(amount, currencyCode = "USD") {
	const numericAmount = Number(amount);

	if (!Number.isFinite(numericAmount)) {
		return "Price on request";
	}

	try {
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: currencyCode || "USD",
			maximumFractionDigits: 0
		}).format(numericAmount);
	} catch {
		return `${numericAmount.toLocaleString("en-US")} ${currencyCode || "USD"}`;
	}
}

export function formatCompactNumber(value) {
	const numericValue = Number(value);

	if (!Number.isFinite(numericValue)) {
		return "0";
	}

	return new Intl.NumberFormat("en-US", {
		notation: "compact",
		maximumFractionDigits: 1
	}).format(numericValue);
}
