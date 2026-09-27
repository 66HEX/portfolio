import { validatePortfolio } from "./validate.ts";

try {
  await validatePortfolio();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
