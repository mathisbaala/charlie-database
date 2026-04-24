import { expect, test } from '@playwright/test';

test('parcours due diligence', async ({ page }) => {
  let searchCalled = false;
  await page.route('**/api/search**', async (route) => {
    searchCalled = true;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        results: [
          {
            siren: '123456789',
            nom: 'ACME SAS',
            forme_juridique: 'SAS',
            ville: 'Paris',
            secteur: 'Conseil',
            effectif: '20 à 49',
          },
        ],
      }),
    });
  });

  await page.route('**/api/due-diligence', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        societe: {
          nom: 'ACME SAS',
          siren: '123456789',
          forme: 'SAS',
          secteur: 'Conseil',
          localisation: 'Paris',
          creation: '2018',
          salaries: '35',
          ca: '2,1 M€',
          ebitda: '420 K€',
          capitaux_propres: '900 K€',
          valeur_estimee: '2,5 M€ - 3,2 M€',
          dividendes: 'N/D',
          procedure_collective: 'Aucune',
        },
        actionnariat: ['Jean Dupont — 70% (RNE)'],
        filiales: [],
        kyc: {
          ppe: 'RAS',
          sanctions: 'RAS',
          nantissements: 'Aucun',
          immo_pro: 'N/D',
          score_lcb: 'Faible',
        },
        signaux: [
          {
            type: 'Transmission',
            niveau: 'attention',
            titre: 'Preparation transmission',
            description: 'Signal de preparation',
            source: 'BODACC · 01/03/2026',
          },
        ],
        analyse: 'Profil stable avec opportunite de structuration.',
        actions: [
          {
            priorite: 1,
            action: 'Preparer scenario de transmission',
            timing: 'Dans les 30j',
            rationnel: 'Anticiper la cession',
          },
        ],
      }),
    });
  });

  await page.goto('/');

  await page.getByPlaceholder('Nom ou SIREN').fill('acm');
  await expect
    .poll(() => searchCalled)
    .toBe(true);
  await page.locator('.search-item').first().click();
  await page.getByRole('button', { name: 'Analyser le dossier' }).click();

  await expect(page.getByText('Synthese Intelligence Client')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'ACME SAS' })).toBeVisible();
  await expect(page.getByText('Preparation transmission').first()).toBeVisible();
});
