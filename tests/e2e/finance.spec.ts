import { test, expect } from "@playwright/test";
import { login } from "./helpers/auth";

test.describe("Financeiro", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto("/app/financeiro");
    await page.waitForLoadState("networkidle");
  });

  test("página financeira carrega com cards de resumo", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /financeiro/i }).first()).toBeVisible();
    await expect(page.getByText(/receita|entrada/i).first()).toBeVisible({ timeout: 8000 });
    await expect(page.getByText(/despesa|saída/i).first()).toBeVisible({ timeout: 5000 });
  });

  test("filtro de mês altera a visualização sem crashes", async ({ page }) => {
    // Month filter is only shown in the "Caixa" tab
    await page.getByRole("button", { name: /caixa/i }).click();
    await page.waitForLoadState("networkidle");

    const monthInput = page.locator('input[type="month"]').first();
    await expect(monthInput).toBeVisible();

    const prevMonth = new Date();
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    const value = prevMonth.toISOString().slice(0, 7); // "YYYY-MM"

    // Month inputs need programmatic value setting in Playwright
    await monthInput.evaluate((el: HTMLInputElement, val: string) => {
      el.value = val;
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }, value);

    await page.waitForLoadState("networkidle");

    // Page should still render correctly
    await expect(page.getByRole("heading", { name: /financeiro/i }).first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(/Algo saiu do lugar/i)).not.toBeVisible();
  });

  test("seção de pagamentos renderiza sem erros", async ({ page }) => {
    // The finance page shows payments table or empty state
    await expect(
      page.getByRole("table")
        .or(page.getByText(/nenhum pagamento|sem registro|Mensalidades/i).first()),
    ).toBeVisible({ timeout: 8000 });

    await expect(page.getByText(/Algo saiu do lugar/i)).not.toBeVisible();
  });

  test("seção de gráficos renderiza sem erros", async ({ page }) => {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    await expect(
      page.getByText(/Receita.*Esperado|Inadimplência|Evolução/i).first(),
    ).toBeVisible({ timeout: 8000 });

    await expect(page.getByText(/Algo saiu do lugar/i)).not.toBeVisible();
  });
});
