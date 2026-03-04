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
    describe('plug-in MARC authority | Browse', () => {
      const testData = {
        typeOfHeadingsAccordionName: 'Type of heading',
        searchQuery: 'Apple',
        headingTypes: ['Corporate Name', 'Conference Name'],
        tags: {
          tag700: '700',
        },
        instanceTitle: 'The data for C359184',
        authSearchOption: {
          CORPORATE_NAME: 'Corporate/Conference name',
        },
        instanceIDs: [],
        authorityIDs: [],
        marcFiles: [
          {
            marc: 'marcBibC359184.mrc',
            fileName: `C359184 testMarcFileBib.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numberOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthC359184_1.mrc',
            fileName: `C359184 testMarcFileAuth_1.${randomFourDigitNumber()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numberOfRecords: 2,
            propertyName: 'authority',
          },
          {
            marc: 'marcAuthC359184_2.mrc',
            fileName: `C359184 testMarcFileAuth_2.${randomFourDigitNumber()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numberOfRecords: 3,
            propertyName: 'authority',
          },
          {
            marc: 'marcAuthC359184_3.mrc',
            fileName: `C359184 testMarcFileAuth_3.${randomFourDigitNumber()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numberOfRecords: 1,
            propertyName: 'authority',
          },
        ],
      };

      before('Creating user', () => {
        cy.getAdminToken();
        cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
          testData.preconditionUserId = userProperties.userId;

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
            cy.wait(2000);
          });
        });

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ]).then((createdUserProperties) => {
          testData.userProperties = createdUserProperties;

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
        Users.deleteViaApi(testData.preconditionUserId);
        testData.instanceIDs.forEach((id) => {
          InventoryInstance.deleteInstanceViaApi(id);
        });
        testData.authorityIDs.forEach((id) => {
          MarcAuthority.deleteViaAPI(id);
        });
      });

      it(
        'C359184 MARC Authority plug-in | Apply "Type of heading" facet to the browse result list (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C359184'] },
        () => {
          MarcAuthorities.switchToBrowse();
          MarcAuthorities.clickReset();
          MarcAuthorities.searchByParameter(
            testData.authSearchOption.CORPORATE_NAME,
            testData.searchQuery,
          );
          // Need to wait, while data will be updated
          cy.wait(1000);
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: 'Type of heading',
            expectedValues: testData.headingTypes,
            browsePane: true,
          });

          MarcAuthorities.chooseTypeOfHeading(testData.headingTypes[1]);
          cy.wait(1000);
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: 'Type of heading',
            expectedValues: testData.headingTypes[1],
            browsePane: true,
          });
          MarcAuthorities.verifySelectedTypeOfHeading(testData.headingTypes[1]);

          MarcAuthorities.chooseTypeOfHeading(testData.headingTypes[0]);
          cy.wait(1000);
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: 'Type of heading',
            expectedValues: testData.headingTypes,
            browsePane: true,
          });
          MarcAuthorities.verifySelectedTypeOfHeading(testData.headingTypes[1]);
          MarcAuthorities.verifySelectedTypeOfHeading(testData.headingTypes[0]);

          MarcAuthorities.resetTypeOfHeading();
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: 'Type of heading',
            expectedValues: testData.headingTypes,
            browsePane: true,
          });
          MarcAuthorities.verifySelectedTypeOfHeading(testData.headingTypes[0], false);
          MarcAuthorities.verifySelectedTypeOfHeadingCount(0);

          MarcAuthorities.typeNotFullValueInMultiSelectFilterFieldAndCheck(
            testData.typeOfHeadingsAccordionName,
            'name',
            testData.headingTypes[0],
          );
        },
      );
    });
  });
});
