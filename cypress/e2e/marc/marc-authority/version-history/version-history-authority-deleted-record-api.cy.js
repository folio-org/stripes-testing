import Permissions from '../../../../support/dictionary/permissions';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import MarcAuthoritiesDelete from '../../../../support/fragments/marcAuthority/marcAuthoritiesDelete';
import Users from '../../../../support/fragments/users/users';
import VersionHistorySection from '../../../../support/fragments/inventory/versionHistorySection';
import getRandomPostfix, { randomFourDigitNumber, getRandomLetters } from '../../../../support/utils/stringTools';
import TopMenu from '../../../../support/fragments/topMenu';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Version history', () => {
      const randomPostfix = getRandomPostfix();
      const randomDigits = `${randomFourDigitNumber()}${randomFourDigitNumber()}`;
      const testData = {
        authorityHeading: `AT_C663326_MarcAuthority_${randomPostfix}`,
        searchOption: 'Keyword',
        tag010: '010',
        tag100: '100',
        createdRecordId: null,
        authorityUUID: null,
        initialVersionsCount: null,
        apiVersionsCountBeforeDeletion: null,
        userProperties: null,
      };
      const authData = {
        prefix: getRandomLetters(15),
        startWithNumber: '1',
      };
      const permissions = [
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordDelete.gui,
        Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
      ];

      before('Create test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('AT_C663326*');

        cy.createTempUser(permissions).then((userProperties) => {
          testData.userProperties = userProperties;

          MarcAuthorities.createMarcAuthorityViaAPI(authData.prefix, authData.startWithNumber, [
            {
              tag: testData.tag010,
              content: `$a n663326${randomDigits}`,
            },
            {
              tag: testData.tag100,
              content: `$a ${testData.authorityHeading}`,
              indicators: ['1', '\\'],
            },
          ]).then((createdRecordId) => {
            testData.createdRecordId = createdRecordId;

            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });

            MarcAuthorities.searchByParameter('Keyword', testData.authorityHeading);
            MarcAuthorities.selectTitle(testData.authorityHeading);
            MarcAuthority.waitLoading();

            MarcAuthority.edit();
            cy.wait(1000);
            QuickMarcEditor.updateExistingFieldContent(4, '$a n663326880808080');
            QuickMarcEditor.checkButtonsEnabled();
            cy.wait(500);
            QuickMarcEditor.pressSaveAndClose();
            MarcAuthority.waitLoading();
          });
        });
      });

      after('Delete test data', () => {
        cy.getAdminToken();
        MarcAuthorities.deleteViaAPI(testData.createdRecordId, true);
        Users.deleteViaApi(testData.userProperties.userId);
      });

      it(
        'C663326 Check "Version history" API for deleted "MARC authority" record (spitfire)',
        { tags: ['extendedPath', 'spitfire', 'C663326'] },
        () => {
          // Step 1-2: Click on the 'Version history' icon and verify the pane opens
          MarcAuthority.verifyVersionHistoryButtonShown();

          // Intercept the audit-data API call to get the correct UUID
          cy.intercept('GET', '**/audit-data/marc/authority/**').as('auditDataRequest');

          MarcAuthority.clickVersionHistoryButton();
          VersionHistorySection.waitLoading();

          // Get the correct UUID from the intercepted request and store version count
          cy.wait('@auditDataRequest').then((interception) => {
            const url = interception.request.url;
            testData.authorityUUID = url.split('/').pop().split('?')[0];

            VersionHistorySection.getVersionHistoryValue().then((versionsCount) => {
              testData.initialVersionsCount = versionsCount;
              VersionHistorySection.clickCloseButton();
              MarcAuthority.waitLoading();

              // Step 3: UUID already extracted from audit API call in Step 1-2
              // Step 4: Send GET request to "Version history" API before deletion
              MarcAuthority.getVersionHistoryViaAPI(testData.authorityUUID).then(
                ({ status, body }) => {
                  expect(status).to.equal(200);

                  const apiVersionsCount = body.totalRecords;
                  expect(apiVersionsCount).to.be.greaterThan(0);

                  testData.apiVersionsCountBeforeDeletion = apiVersionsCount;
                },
              );

              // Step 5: Click on the "Actions" >> "Delete" >> "Delete" in modal
              MarcAuthoritiesDelete.clickDeleteButton();
              MarcAuthoritiesDelete.checkDeleteModal();
              MarcAuthoritiesDelete.confirmDelete();
              MarcAuthoritiesDelete.verifyDeleteComplete(testData.authorityHeading);

              // Wait a bit for audit data to be updated
              cy.wait(3000);

              // Step 6: Send GET request to "Version history" API after deletion
              MarcAuthority.getVersionHistoryViaAPI(testData.authorityUUID).then(
                ({ status, body }) => {
                  expect(status).to.equal(200);

                  const finalVersionsCount = body.totalRecords;
                  expect(finalVersionsCount).to.equal(testData.apiVersionsCountBeforeDeletion + 1);
                },
              );
            });
          });
        },
      );
    });
  });
});
