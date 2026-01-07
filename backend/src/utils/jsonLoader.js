import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

/**
 * Loads a JSON file from the specified path
 * @param {string} relativePath - Path relative to the current file
 * @returns {Object} Parsed JSON content
 */
export const loadJsonFile = (relativePath) => {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const filePath = join(__dirname, "..", "..", relativePath);

    const fileContent = readFileSync(filePath, "utf8");
    return JSON.parse(fileContent);
  } catch (error) {
    console.error(`Error loading JSON file: ${relativePath}`, error);
    throw error;
  }
};
