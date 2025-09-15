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
        tag: '700',
        instanceTitle: 'The data for C360551',
        authTitle: 'Apple & Honey Productions',
        authSourceOptions: {
          NOT_SPECIFIED: 'Not specified',
        },
        authSearchOption: {
          GENRE: 'Genre',
        },
        absenceMessage: 'No results found for "Europe". Please check your spelling and filters.',
        instanceIDs: [],
        authorityIDs: [],
        marcFiles: [
          {
            marc: 'marcBibC360551.mrc',
            fileName: `testMarcFileBib360551.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numberOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthC360551.mrc',
            fileName: `testMarcFileAuthC360551.${randomFourDigitNumber()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
            numberOfRecords: 13,
            propertyName: 'authority',
          },
        ],
      };

      before('Creating user', () => {
        cy.getAdminToken();
        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
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
          MarcAuthorities.getMarcAuthoritiesViaApi({
            limit: 100,
            query: 'keyword="C360551" and (authRefType==("Authorized" or "Auth/Ref"))',
          }).then((authorities) => {
            if (authorities) {
              authorities.forEach(({ id }) => {
                MarcAuthority.deleteViaAPI(id);
              });
            }
          });
        });
        cy.getAdminToken()
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
            cy.waitForAuthRefresh(() => {
              cy.login(testData.userProperties.username, testData.userProperties.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
              InventoryInstances.waitContentLoading();
            }, 20_000);
            InventoryInstances.searchByTitle(testData.instanceTitle);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            InventoryInstance.verifyAndClickLinkIcon(testData.tag);
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
        'C360551 MARC Authority plug-in | Search: Verify that the "Authority source" facet option will display the name of facet option when zero results are returned (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C360551'] },
        () => {
          MarcAuthorities.checkAuthoritySourceOptionsInPlugInModal();
          MarcAuthorities.chooseAuthoritySourceOption(testData.authSourceOptions.NOT_SPECIFIED);
          MarcAuthorities.checkSelectedAuthoritySourceInPlugInModal(
            testData.authSourceOptions.NOT_SPECIFIED,
          );
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          MarcAuthorities.searchByParameter(testData.authSearchOption.GENRE, 'Europe');
          MarcAuthorities.verifySearchResultTabletIsAbsent(true);

          MarcAuthorities.checkNoResultsMessage(testData.absenceMessage);
          MarcAuthorities.checkTotalRecordsForOptionInPlugInModal(
            testData.authSourceOptions.NOT_SPECIFIED,
            0,
          );
        },
      );
    });
  });
});
