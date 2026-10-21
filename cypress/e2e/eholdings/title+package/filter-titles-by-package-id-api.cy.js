import { validate } from 'jsonschema';
import eHoldingsTitlesSchema from '../../../jsonSchemas/eHoldingsTitlesSchema';
import eHoldingsPackages from '../../../support/fragments/eholdings/eHoldingsPackages';
import EHoldingsTitles from '../../../support/fragments/eholdings/eHoldingsTitles';

describe('eHoldings', () => {
  describe('Titles', () => {
    let packageId;

    before('Get "Wiley Online Library" package id', () => {
      cy.getAdminToken();
      eHoldingsPackages.getPackageViaApi('Wiley Online Library').then(({ body }) => {
        // for API call parameters, we need just the last part while the whole value is "<providerId>-<packageId>"
        packageId = body.data[0].id.split('-').at(-1);
      });
    });

    it(
      'C385637 API | Use "Package" filter in GET request "/eholdings/titles" (promin)',
      { tags: ['backend', 'promin', 'C385637'] },
      () => {
        cy.getAdminToken();

        // Step 6: GET /eholdings/titles?filter[name]=wiley - unscoped by package.
        // okapiRequest fails the test on a non-2xx response, so reaching .then() here
        // already proves the 200 status from TestRail's expected result.
        EHoldingsTitles.getEHoldingsTitlesViaApi({ 'filter[name]': 'wiley' }).then(
          (unfilteredBody) => {
            const unfilteredValidation = validate(unfilteredBody, eHoldingsTitlesSchema);
            expect(unfilteredValidation.valid, unfilteredValidation.errors.toString()).to.be.equal(
              true,
            );
            const unfilteredTotal = unfilteredBody.meta.totalResults;

            // Step 7: GET /eholdings/titles?filter[name]=wiley&filter[packageIds]=<id> -
            // same name query, scoped to the "Wiley Online Library" package. Replaces
            // TestRail's UI "Records found" counter comparison (step 5) with a direct
            // API-to-API comparison: the package-scoped totalResults must be a non-empty
            // subset of the unscoped totalResults, proving the packageIds filter narrows
            // the result set.
            EHoldingsTitles.getEHoldingsTitlesViaApi({
              'filter[name]': 'wiley',
              'filter[packageIds]': packageId,
            }).then((filteredBody) => {
              const filteredValidation = validate(filteredBody, eHoldingsTitlesSchema);
              expect(filteredValidation.valid, filteredValidation.errors.toString()).to.be.equal(
                true,
              );
              const filteredTotal = filteredBody.meta.totalResults;

              expect(filteredTotal).to.be.greaterThan(0);
              expect(filteredTotal).to.be.lessThan(unfilteredTotal);
            });
          },
        );
      },
    );
  });
});
