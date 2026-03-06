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
        tags: {
          tag700: '700',
        },
        instanceTitle: 'C380573',
        authTitles: [
          'C380573 Ouyang, Hui',
          'C380573 Dunning, Mike',
          'C380573 Lovecraft, H. P. (Howard Phillips), 1890-1937. Herbert West, reanimator',
          'C380573 Interborough Rapid Transit Company Powerhouse (New York, N.Y.)',
        ],
        advancesSearchQuery:
          'identifiers.value exactPhrase n  80094057380573 or personalNameTitle exactPhrase C380573 Dunning, Mike or corporateNameTitle exactPhrase C380573 Interborough Rapid Transit Company Powerhouse (New York, N.Y.) or nameTitle exactPhrase C380573 Lovecraft, H. P. (Howard Phillips), 1890-1937. Herbert West, reanimator',
        partialAdvancesSearchQuery:
          'personalNameTitle exactPhrase C380573 Dunning, Mike or corporateNameTitle exactPhrase C380573 Interborough Rapid Transit Company Powerhouse (New York, N.Y.) or nameTitle exactPhrase C380573 Lovecraft, H. P. (Howard Phillips), 1890-1937. Herbert West, reanimator',
        authRows: {
          interboroughAuth: {
            title: 'C380573 Interborough Rapid Transit Company Powerhouse (New York, N.Y.)',
            tag: '110',
          },
        },
        instanceIDs: [],
        authorityIDs: [],
        marcFiles: [
          {
            marc: 'marcBibC380573.mrc',
            fileName: `testMarcFileBibC380573.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numberOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthC380573.mrc',
            fileName: `testMarcFileAuthC380573.${randomFourDigitNumber()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numberOfRecords: 4,
            propertyName: 'authority',
          },
        ],
      };

      before('Creating user', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ])
          .then((createdUserProperties) => {
            testData.userProperties = createdUserProperties;
            InventoryInstances.deleteInstanceByTitleViaApi('C380573');
            MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C380573');
          })
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
              authRefresh: true,
            });
            InventoryInstances.searchByTitle(testData.instanceIDs[0]);
            InventoryInstances.selectInstanceById(testData.instanceIDs[0]);
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
        'C380573 MARC Authority plug-in | Search using "Advanced search" option (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C380573'] },
        () => {
          MarcAuthorities.searchBy('Advanced search', testData.advancesSearchQuery, true);
          cy.ifConsortia(true, () => {
            MarcAuthorities.clickAccordionByName('Shared');
            MarcAuthorities.actionsSelectCheckbox('No');
          });
          MarcAuthorities.checkRowsCount(4);
          MarcAuthorities.selectItem(testData.authRows.interboroughAuth.title, false);
          MarcAuthorities.checkFieldAndContentExistence(
            testData.authRows.interboroughAuth.tag,
            testData.authRows.interboroughAuth.title,
          );
          MarcAuthorities.checkRecordDetailPageMarkedValue(
            testData.authRows.interboroughAuth.title,
          );

          MarcAuthorities.searchBy('Advanced search', testData.partialAdvancesSearchQuery, true);
          MarcAuthorities.verifyMarcViewPaneIsOpened(false);
          MarcAuthorities.checkRowsCount(3);
        },
      );
    });
  });
});
