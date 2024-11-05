import { Permissions } from '../../../../support/dictionary';
import Users from '../../../../support/fragments/users/users';

describe('Inventory', () => {
  describe('Settings', () => {
    describe('Classification browse', () => {
      let user;
      let originalDateType;

      const testData = {
        totalAmountOfDateTypes: 15,
        dateTypeSource: 'folio',
        displayFormatKey: 'displayFormat',
        codeKey: 'code',
        delimiterKey: 'delimiter',
        keepDelimiterKey: 'keepDelimiter',
        sourceKey: 'source',
        newCode: 's',
        newDelimiter: ',',
        newKeepDelimiter: false,
        newSource: 'local',
      };

      const errorMessageText = (key) => `Unrecognized field "${key}"`;

      before('Create user, get data', () => {
        cy.getAdminToken();
        cy.getInstanceDateTypesViaAPI().then((response) => {
          originalDateType = response.instanceDateTypes[0];
        });
        cy.createTempUser([
          Permissions.getInstanceDateTypes.gui,
          Permissions.patchInstanceDateTypes.gui,
        ]).then((userProperties) => {
          user = userProperties;
        });
      });

      after('Delete user', () => {
        cy.getAdminToken();
        // restore the original instance date type field values (if changed)
        cy.patchInstanceDateTypeViaAPI(
          originalDateType.id,
          testData[testData.codeKey],
          originalDateType[testData.codeKey],
          true,
        );
        cy.patchInstanceDateTypeViaAPI(
          originalDateType.id,
          testData[testData.displayFormatKey],
          {
            delimiter: originalDateType[testData.delimiterKey],
            keepDelimiter: originalDateType[testData.keepDelimiterKey],
          },
          true,
        );
        cy.patchInstanceDateTypeViaAPI(
          originalDateType.id,
          testData[testData.sourceKey],
          originalDateType[testData.sourceKey],
          true,
        );
        Users.deleteViaApi(user.userId);
      });

      it(
        'C506695 Cannot update "code", "delimiter", "keepDelimiter", "source" of Date type (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C506695'] },
        () => {
          cy.getUserToken(user.username, user.password);
          cy.patchInstanceDateTypeViaAPI(
            originalDateType.id,
            testData.codeKey,
            testData.newCode,
            true,
          ).then(({ status, body }) => {
            expect(status).to.eq(422);
            expect(body.errors[0].message).to.include(errorMessageText(testData.codeKey));
          });
          cy.patchInstanceDateTypeViaAPI(
            originalDateType.id,
            testData.displayFormatKey,
            { delimiter: testData.newDelimiter },
            true,
          ).then(({ status, body }) => {
            expect(status).to.eq(422);
            expect(body.errors[0].message).to.include(errorMessageText(testData.displayFormatKey));
          });
          cy.patchInstanceDateTypeViaAPI(
            originalDateType.id,
            testData.displayFormatKey,
            { keepDelimiter: testData.newKeepDelimiter },
            true,
          ).then(({ status, body }) => {
            expect(status).to.eq(422);
            expect(body.errors[0].message).to.include(errorMessageText(testData.displayFormatKey));
          });
          cy.patchInstanceDateTypeViaAPI(
            originalDateType.id,
            testData.sourceKey,
            testData.newSource,
            true,
          ).then(({ status, body }) => {
            expect(status).to.eq(422);
            expect(body.errors[0].message).to.include(errorMessageText(testData.sourceKey));
          });

          cy.getInstanceDateTypesViaAPI().then((response) => {
            expect(response.status).to.eq(200);
            const updatedDateType = response.instanceDateTypes.filter(
              (type) => type.id === originalDateType.id,
            )[0];
            expect(updatedDateType[testData.codeKey]).to.eq(originalDateType[testData.codeKey]);
            expect(updatedDateType[testData.displayFormatKey][testData.delimiterKey]).to.eq(
              originalDateType[testData.displayFormatKey][testData.delimiterKey],
            );
            expect(updatedDateType[testData.displayFormatKey][testData.keepDelimiterKey]).to.eq(
              originalDateType[testData.displayFormatKey][testData.keepDelimiterKey],
            );
            expect(updatedDateType[testData.sourceKey]).to.eq(originalDateType[testData.sourceKey]);
          });
        },
      );
    });
  });
});
