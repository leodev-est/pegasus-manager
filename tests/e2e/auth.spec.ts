import { test, expect } from "@playwright/test";
import { login, logout, E2E_USERNAME, E2E_PASSWORD } from "./helpers/auth";

test.describe("Autenticação", () => {
  test("login com credenciais inválidas exibe mensagem de erro", async ({ page }) => {
    await page.goto("/login");
    await page.evaluate(() => {
      localStorage.removeItem("pegasus-manager:token");
      localStorage.removeItem("pegasus-manager:user");
    });
    await page.reload();

    await page.getByPlaceholder("Seu usuário").fill("usuario_invalido_xyz");
    await page.getByPlaceholder("Sua senha").fill("senha_errada_xyz");
    await page.getByRole("button", { name: "Entrar" }).click();

    // Error shown inline on page or via toast
    await expect(
      page.getByText(/inválid/i).or(page.getByText(/incorret/i)).or(page.getByText(/não encontrad/i)).first(),
    ).toBeVisible({ timeout: 8000 });
    expect(page.url()).toContain("/login");
  });

  test("login com credenciais válidas redireciona para o dashboard", async ({ page }) => {
    await login(page);
    await expect(page).toHaveURL(/\/app/);
    await expect(page.getByText(/Dashboard|atleta|mensalidade/i).first()).toBeVisible({ timeout: 8000 });
  });

  test("usuário autenticado não é redirecionado ao acessar /app", async ({ page }) => {
    await login(page);
    await page.goto("/app");
    await expect(page).toHaveURL(/\/app/);
    expect(page.url()).not.toContain("/login");
  });

  test("logout encerra a sessão e redireciona para /login", async ({ page }) => {
    await login(page);
    await logout(page);
    await expect(page).toHaveURL(/\/login/);
  });

  test("usuário não autenticado é redirecionado ao tentar acessar /app", async ({ page }) => {
    // Ensure no stored session
    await page.goto("/login");
    await page.evaluate(() => {
      localStorage.removeItem("pegasus-manager:token");
      localStorage.removeItem("pegasus-manager:user");
    });
    await page.goto("/app");
    await expect(page).toHaveURL(/\/login/);
  });
});
