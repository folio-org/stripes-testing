import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import { Permissions } from '../../../../support/dictionary';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorityBrowse from '../../../../support/fragments/marcAuthority/MarcAuthorityBrowse';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix, { randomFourDigitNumber } from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('plug-in MARC authority', () => {
    describe('plug-in MARC authority | Browse', () => {
      const testData = {
        tags: {
          tag700: '700',
        },
        instanceTitle: 'AT_C422103_MarcBibInstance',
        authTitle: 'C422103 Clovio, Giulio, 1498-1578',
        markedTitle: 'C422103 Clovio, Giulio,',
        instanceIDs: [],
        authorityIDs: [],
        marcFiles: [
          {
            marc: 'marcBibC422103.mrc',
            fileName: `testMarcFileBibC422103.${getRandomPostfix()}.mrc`,
            jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
            numberOfRecords: 1,
            propertyName: 'instance',
          },
          {
            marc: 'marcAuthC422103.mrc',
            fileName: `testMarcFileAuthC422103.${randomFourDigitNumber()}.mrc`,
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
          InventoryInstances.deleteInstanceByTitleViaApi(testData.instanceTitle);
          MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C422103');

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
        'C422103 MARC Authority plug-in | Select "Browse" MARC authority records (spitfire) (TaaS)',
        { tags: ['criticalPath', 'spitfire', 'C422103'] },
        () => {
          MarcAuthorities.switchToBrowse();
          MarcAuthorityBrowse.verifyBrowseAuthorityPane('Personal name', 'Dugmore, C. W.');

          MarcAuthorityBrowse.checkSearchOptions();

          MarcAuthorityBrowse.searchBy('Personal name', testData.authTitle);
          cy.ifConsortia(true, () => {
            MarcAuthorities.clickAccordionByName('Shared');
            MarcAuthorities.actionsSelectCheckbox('No');
          });
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);
          MarcAuthorities.checkColumnExists('Link');
          MarcAuthorities.checkColumnExists('Authorized/Reference');
          MarcAuthorities.checkColumnExists('Heading/Reference');
          MarcAuthorities.checkColumnExists('Type of heading');

          MarcAuthorities.checkColumnExists('Authority source');
          MarcAuthorities.verifyAllAuthorizedAreBold('Authorized');
          MarcAuthorities.verifyColumnValuesOnlyExist({
            column: 'Authorized/Reference',
            expectedValues: ['Authorized', 'Reference'],
            browsePane: true,
          });
          MarcAuthorities.verifyAllAuthorizedHaveLinks();

          MarcAuthorities.verifyTextOfPaneHeaderMarcAuthority('');

          MarcAuthorities.verifyPagination();

          MarcAuthorities.selectItem(testData.authTitle);
          MarcAuthority.waitLoading();
          MarcAuthorities.checkRecordDetailPageMarkedValue(testData.markedTitle);

          MarcAuthorities.verifyLinkButtonExistOnMarcViewPane();
          MarcAuthority.verifyHeader(testData.authTitle);

          MarcAuthorities.closeMarcViewPane();
          MarcAuthorities.verifySearchResultTabletIsAbsent(false);

          MarcAuthorities.closeFindAuthorityModal();
          QuickMarcEditor.waitLoading();
        },
      );
    });
  });
});
