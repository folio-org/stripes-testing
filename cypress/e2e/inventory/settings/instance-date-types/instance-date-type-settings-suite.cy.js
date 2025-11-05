import { Permissions } from '../../../../support/dictionary';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';
import { INSTANCE_DATE_TYPES } from '../../../../support/constants';

describe('Inventory', () => {
  describe('Settings', () => {
    describe('Date type', () => {
      let user;
      const dateTypesData = [
        { name: INSTANCE_DATE_TYPES.BC, code: 'b', delimiter: ',', keepDelimiter: false },
        {
          name: INSTANCE_DATE_TYPES.CONTINUING_PUBLISHED,
          code: 'c',
          delimiter: '-',
          keepDelimiter: true,
        },
        {
          name: INSTANCE_DATE_TYPES.CONTINUING_CEASED,
          code: 'd',
          delimiter: '-',
          keepDelimiter: true,
        },
        { name: INSTANCE_DATE_TYPES.DETAILED, code: 'e', delimiter: ',', keepDelimiter: false },
        { name: INSTANCE_DATE_TYPES.INCLUSIVE, code: 'i', delimiter: '-', keepDelimiter: true },
        { name: INSTANCE_DATE_TYPES.RANGE, code: 'k', delimiter: '-', keepDelimiter: true },
        { name: INSTANCE_DATE_TYPES.MULTIPLE, code: 'm', delimiter: ',', keepDelimiter: false },
        { name: INSTANCE_DATE_TYPES.UNKNOWN, code: 'n', delimiter: ',', keepDelimiter: false },
        { name: INSTANCE_DATE_TYPES.DISTRIBUTION, code: 'p', delimiter: ',', keepDelimiter: false },
        { name: INSTANCE_DATE_TYPES.QUESTIONABLE, code: 'q', delimiter: ',', keepDelimiter: false },
        { name: INSTANCE_DATE_TYPES.REPRINT, code: 'r', delimiter: ',', keepDelimiter: false },
        { name: INSTANCE_DATE_TYPES.SINGLE, code: 's', delimiter: ',', keepDelimiter: false },
        { name: INSTANCE_DATE_TYPES.PUBLICATION, code: 't', delimiter: ',', keepDelimiter: false },
        {
          name: INSTANCE_DATE_TYPES.CONTINUING_UNKNOWN,
          code: 'u',
          delimiter: '-',
          keepDelimiter: true,
        },
        { name: INSTANCE_DATE_TYPES.NO, code: '|', delimiter: ',', keepDelimiter: false },
      ];

      before('Create user, authorize', () => {
        cy.getAdminToken();
        cy.createTempUser([Permissions.getInstanceDateTypes.gui]).then((userProperties) => {
          user = userProperties;
          cy.getToken(user.username, user.password, false);
        });
      });

      after('Delete user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(user.userId);
      });

      it(
        'C506693 API | View Date types (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C506693'] },
        () => {
          cy.getInstanceDateTypesViaAPI().then((response) => {
            dateTypesData.forEach((expectedDateType) => {
              const matchingDateTypes = response.instanceDateTypes.filter((retrievedDateType) => {
                return (
                  retrievedDateType.name === expectedDateType.name &&
                  retrievedDateType.code === expectedDateType.code &&
                  retrievedDateType.displayFormat.delimiter === expectedDateType.delimiter &&
                  retrievedDateType.displayFormat.keepDelimiter === expectedDateType.keepDelimiter
                );
              });
              expect(matchingDateTypes).to.have.lengthOf(1);
            });
          });
        },
      );
    });
  });
});

describe('Inventory', () => {
  describe('Settings', () => {
    describe('Date type', () => {
      let user;
      let originalDateType;

      const testData = {
        totalAmountOfDateTypes: 15,
        dateTypeSource: 'folio',
        keyToUpdate: 'name',
        newName: `Fortlaufende Ressource - Update zur Einstellung der Veröffentlichung ${getRandomPostfix()}`,
      };

      before('Create user, get data', () => {
        cy.getAdminToken();
        cy.getInstanceDateTypesViaAPI().then((response) => {
          originalDateType = response.instanceDateTypes[response.instanceDateTypes.length - 1];
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
        // restore the original instance date type name
        cy.patchInstanceDateTypeViaAPI(
          originalDateType.id,
          testData.keyToUpdate,
          originalDateType.name,
          true,
        );
        Users.deleteViaApi(user.userId);
      });

      it(
        'C506694 Update of Date type\'s "name" (spitfire)',
        { tags: ['criticalPath', 'spitfire', 'C506694'] },
        () => {
          cy.getUserToken(user.username, user.password);
          cy.patchInstanceDateTypeViaAPI(
            originalDateType.id,
            testData.keyToUpdate,
            testData.newName,
          ).then(({ status }) => {
            expect(status).to.eq(204);
            cy.getInstanceDateTypesViaAPI().then((response) => {
              expect(response.status).to.eq(200);
              expect(response.instanceDateTypes).to.have.lengthOf(testData.totalAmountOfDateTypes);
              expect(
                response.instanceDateTypes.every((type) => type.source === testData.dateTypeSource),
              ).to.eq(true);
              const updatedDateType = response.instanceDateTypes.filter(
                (type) => type.id === originalDateType.id,
              )[0];
              expect(updatedDateType.name).to.eq(testData.newName);
            });
          });
        },
      );
    });
  });
});

describe('Inventory', () => {
  describe('Settings', () => {
    describe('Date type', () => {
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
