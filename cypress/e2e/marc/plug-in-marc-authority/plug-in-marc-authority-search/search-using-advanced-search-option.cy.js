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
          'Ouyang, Hui',
          'Dunning, Mike',
          'Lovecraft, H. P. (Howard Phillips), 1890-1937. Herbert West, reanimator',
          'Interborough Rapid Transit Company Powerhouse (New York, N.Y.)',
        ],
        advancesSearchQuery:
          'identifiers.value exactPhrase n  80094057 or personalNameTitle exactPhrase Dunning, Mike or corporateNameTitle exactPhrase Interborough Rapid Transit Company Powerhouse (New York, N.Y.) or nameTitle exactPhrase Lovecraft, H. P. (Howard Phillips), 1890-1937. Herbert West, reanimator',
        partialAdvancesSearchQuery:
          'personalNameTitle exactPhrase Dunning, Mike or corporateNameTitle exactPhrase Interborough Rapid Transit Company Powerhouse (New York, N.Y.) or nameTitle exactPhrase Lovecraft, H. P. (Howard Phillips), 1890-1937. Herbert West, reanimator',
        authRows: {
          interboroughAuth: {
            title: 'Interborough Rapid Transit Company Powerhouse (New York, N.Y.)',
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
          testData.authTitles.forEach((query) => {
            MarcAuthorities.getMarcAuthoritiesViaApi({
              limit: 100,
              query: `keyword="${query}" and (authRefType==("Authorized" or "Auth/Ref"))`,
            }).then((authorities) => {
              if (authorities) {
                authorities.forEach(({ id }) => {
                  MarcAuthority.deleteViaAPI(id, true);
                });
              }
            });
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
          });
          cy.login(testData.userProperties.username, testData.userProperties.password, {
            path: TopMenu.inventoryPath,
            waiter: InventoryInstances.waitContentLoading,
            authRefresh: true,
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
