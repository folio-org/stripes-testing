import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    describe('plug-in MARC authority | Search', () => {
      const testData = {
        typeOfHeadingsAccordionName: 'Type of heading',
        headingTypes: ['Corporate Name', 'Conference Name'],
        tags: {
          tag700: '700',
        },
        instanceTitle: 'The data for C359199',
        authSearchOption: {
          CORPORATE_NAME: 'Corporate/Conference name',
        },
        instanceIDs: [],
        authorityIDs: [],
        marcFiles: [
          {
            marc: 'marcBibC359199.mrc',
            fileName: `testMarcFileBibC359199.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numberOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthC359199_1.mrc',
            fileName: `testMarcFileAuthC359199_1.${randomFourDigitNumber()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numberOfRecords: 1,
            propertyName: 'authority',
          },
          {
            marc: 'marcAuthC359199_2.mrc',
            fileName: `testMarcFileAuthC359199_2.${randomFourDigitNumber()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numberOfRecords: 1,
            propertyName: 'authority',
          },
        ],
      };

      before('Creating user', () => {
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;
          InventoryInstances.getInstancesViaApi({
            limit: 100,
            query: `title="${testData.instanceTitle}"`,
          }).then((instances) => {
            if (instances) {
              instances.forEach(({ id }) => {
                InventoryInstance.deleteInstanceViaApi(id);
              });
            }
          });
        });
        cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading })
          .then(() => {
            testData.marcFiles.forEach((marcFile) => {
              DataImport.uploadFileViaApi(
                marcFile.marc,
                marcFile.fileName,
                marcFile.jobProfileToRun,
              ).then((response) => {
                response.forEach((record) => {
                  if (
                    marcFile.jobProfileToRun === DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS
                  ) {
                    testData.instanceIDs.push(record[marcFile.propertyName].id);
                  } else {
                    testData.authorityIDs.push(record[marcFile.propertyName].id);
                  }
                });
              });
            });
          })
          .then(() => {
            cy.login(testData.userProperties.username, testData.userProperties.password, {
              path: TopMenu.inventoryPath,
              waiter: InventoryInstances.waitContentLoading,
            });
            InventoryInstances.searchByTitle(testData.instanceTitle);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            InventoryInstance.verifyAndClickLinkIcon(testData.tags.tag700);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
          });
      });

      after('Deleting created user', () => {
        cy.getAdminToken();
        Users.deleteViaApi(testData.userProperties.userId);
        testData.instanceIDs.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
        testData.authorityIDs.forEach((id) => {
          MarcAuthority.deleteViaAPI(id);
        });
      });

      it(
        'C359199 MARC Authority plug-in | Apply "Type of heading" facet to the search result list (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C359199'] },
        () => {
          MarcAuthorities.searchByParameter(testData.authSearchOption.CORPORATE_NAME, '*');
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: 'Type of heading',
            expectedValues: testData.headingTypes,
          });

          MarcAuthorities.chooseTypeOfHeading(testData.headingTypes[0]);
          cy.wait(2000);
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: 'Type of heading',
            expectedValues: testData.headingTypes[0],
          });

          MarcAuthorities.chooseTypeOfHeading(testData.headingTypes[1]);
          cy.wait(2000);
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: 'Type of heading',
            expectedValues: testData.headingTypes,
          });

          MarcAuthorities.unselectHeadingType(testData.headingTypes[0]);
          cy.wait(2000);

          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: 'Type of heading',
            expectedValues: testData.headingTypes[1],
          });

          MarcAuthorities.resetTypeOfHeading();
          cy.wait(2000);
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: 'Type of heading',
            expectedValues: testData.headingTypes,
          });

          MarcAuthorities.typeNotFullValueInMultiSelectFilterFieldAndCheck(
            testData.typeOfHeadingsAccordionName,
            'name',
            testData.headingTypes[0],
          );

          MarcAuthorities.clickResetAndCheck();
        },
      );
    });
  });
});
