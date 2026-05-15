import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Gestão de Atletas", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto("/app/rh/atletas");
    await page.waitForLoadState("networkidle");
  });

  test("página de atletas carrega a listagem", async ({ page }) => {
    // Page header should be visible — pick the first match to avoid strict violations
    await expect(page.getByRole("heading", { name: /atleta/i }).first()).toBeVisible();
    await expect(
      page.getByRole("table").or(page.getByText(/nenhum atleta/i)),
    ).toBeVisible({ timeout: 8000 });
  });

  test("abre modal de novo atleta com formulário", async ({ page }) => {
    await page.getByRole("button", { name: /novo atleta/i }).click();

    // Modal title text is used as identifier (component doesn't use role="dialog")
    await expect(page.getByText("Novo atleta").last()).toBeVisible({ timeout: 5000 });
    await expect(page.getByLabel("Nome", { exact: true })).toBeVisible();
    await expect(page.getByLabel(/e-mail/i)).toBeVisible();
  });

  test("cria atleta em modo teste e toast de sucesso aparece", async ({ page }) => {
    await page.getByRole("button", { name: /novo atleta/i }).click();
    await expect(page.getByText("Novo atleta").last()).toBeVisible({ timeout: 5000 });

    await page.getByLabel("Nome", { exact: true }).fill("E2E Atleta Temp");
    await page.getByLabel(/e-mail/i).fill("e2e-atleta-temp@teste.pegasus");

    // Set status to teste — scope to select that has "teste" option (not the filter bar's select)
    const statusSelect = page.locator("select").filter({ has: page.locator('option[value="teste"]') });
    await statusSelect.selectOption("teste");

    await page.getByRole("button", { name: /cadastrar atleta/i }).click();

    // Toast de sucesso deve aparecer
    await expect(page.getByText(/cadastrado/i)).toBeVisible({ timeout: 8000 });
  });

  test("busca por nome filtra a lista", async ({ page }) => {
    await page.getByLabel(/buscar por nome/i).fill("xyz_nome_inexistente_e2e_9999");
    await expect(
      page.getByText(/nenhum atleta/i),
    ).toBeVisible({ timeout: 6000 });
  });
});
