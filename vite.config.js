import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
    appType: "spa",
    server: {
        port: 5173,
        open: true,
    },
    build: {
        rollupOptions: {
            input: {
                home: resolve(__dirname, "index.html"),
                listings: resolve(__dirname, "listings.html"),
                propertyDetails: resolve(__dirname, "property-details.html"),
                favorites: resolve(__dirname, "favorites.html"),
                contact: resolve(__dirname, "contact.html")
            }
        }
    }
});
