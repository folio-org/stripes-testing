import { DEFAULT_JOB_PROFILE_NAMES } from '../../../support/constants';
import DataImport from '../../../support/fragments/data_import/dataImport';

import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Uploading files', () => {
    before('Get admin token', () => {
      cy.getAdminToken();
    });

    it(
      'UIDATIMP-252: Uploading 2 files with the same extension, but different case, does not work. (folijet) (TaaS)',
      { tags: ['wip'] },
      () => {
        const marcFile = {
          marc: 'oneThousandMarcBib.mrc',
          fileNameImported: `oneThousandMarcBib.${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
        };

        const attempts = Array.from({ length: 5 }, (_, i) => i);
        const uploadPromises = attempts.map((i) => {
          return new Cypress.Promise((resolve) => {
            const fileName = `${marcFile.fileNameImported}_${i}.mrc`;
            cy.wrap(null)
              .then(() => {
                cy.resetTenant();
                cy.getAdminToken();
                cy.setTenant('cs00000int_0001').then(() => {
                  return DataImport.uploadFileViaApi(
                    marcFile.marc,
                    fileName,
                    marcFile.jobProfileToRun,
                  );
                });
              })
              .then((result) => {
                resolve(result);
              });
          });
        });

        Cypress.Promise.all(uploadPromises).then((results) => {
          cy.log('All files uploaded successfully', results);
          // Verify both files were processed successfully
          expect(results).to.have.length(attempts.length);
        });
      },
    );
  });
});
