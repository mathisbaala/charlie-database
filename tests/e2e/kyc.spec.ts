import { expect, test } from '@playwright/test';

test('parcours kyc', async ({ page }) => {
  await page.route('**/api/kyc', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        identification: {
          nom: 'Jean Dupont',
          role: 'Dirigeant',
          detention_pct: '60%',
          naissance_approx: '~1980',
          nationalite: 'Francaise',
          residence_fiscale: 'France',
        },
        beneficiaires_effectifs: [
          {
            nom: 'Jean Dupont',
            role: 'Beneficiaire effectif',
            pct: '60%',
            date_declaration: '2025-03-01',
            statut: 'Conforme',
          },
        ],
        screening: {
          ppe: 'Non',
          sanctions_eu: 'RAS',
          sanctions_ofac: 'RAS',
          pep_level: 'Aucun',
        },
        structure: {
          organigramme_simplifie: '[Jean Dupont 60%] -> [ACME SAS]',
          nantissements: 'N/D',
          baux_commerciaux: 'N/D',
        },
        score_lcb: {
          niveau: 'Faible',
          score: 2,
          facteurs: ['Actionnariat clair'],
          recommandation: 'Entree en relation possible',
        },
        sources: ['RNE', 'BODACC'],
      }),
    });
  });

  await page.goto('/');
  await page.locator('.tabs .tab', { hasText: 'Qualification KYC' }).click();
  await expect(page.getByRole('heading', { name: 'Qualification KYC' })).toBeVisible();
  await page.getByPlaceholder('Nom du dirigeant ou de la personne').fill('Jean Dupont');
  await page.getByRole('button', { name: 'Generer le dossier KYC' }).click();

  await expect(page.getByText('Resultat KYC')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Jean Dupont' })).toBeVisible();
  await expect(page.getByText('Actionnariat clair')).toBeVisible();
});
