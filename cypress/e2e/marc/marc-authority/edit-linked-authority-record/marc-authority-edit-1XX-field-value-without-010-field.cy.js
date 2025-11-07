import { DEFAULT_JOB_PROFILE_NAMES } from '../../../../support/constants';
import Permissions from '../../../../support/dictionary/permissions';
import DataImport from '../../../../support/fragments/data_import/dataImport';
import InventoryInstance from '../../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../../support/fragments/inventory/inventoryInstances';
import InventoryViewSource from '../../../../support/fragments/inventory/inventoryViewSource';
import MarcAuthorities from '../../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../../support/fragments/quickMarcEditor';
import TopMenu from '../../../../support/fragments/topMenu';
import Users from '../../../../support/fragments/users/users';
import getRandomPostfix from '../../../../support/utils/stringTools';

describe('MARC', () => {
  describe('MARC Authority', () => {
    describe('Edit linked Authority record', () => {
      const testData = {
        tag611: '611',
        tag111: '111',
        updatedValue:
          '$a C374158 Vatican Council $n (2nd : $d 1962-1966 : $c Basilica di San Pietro in Vaticano)',
        autoUpdateUserName: 'Automated linking update',
        marcAuthIcon: 'Linked to MARC authority',
      };
      const marcFiles = [
        {
          marc: 'marcBibFileC374158.mrc',
          fileName: `testMarcFileC374158${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          instanceTitle: 'An Anglican view of the Vatican Council.',
          propertyName: 'instance',
        },
        {
          marc: 'marcAuthFileC374158.mrc',
          fileName: `testMarcFileC374158${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          authorityHeading:
            'C374158 Vatican Council (2nd : 1962-1965 : Basilica di San Pietro in Vaticano)',
          updatedAuthorityHeading:
            'C374158 Vatican Council (2nd : 1962-1966 : Basilica di San Pietro in Vaticano)',
          propertyName: 'authority',
        },
      ];
      const linkingTagAndValue = {
        rowIndex: 15,
        value: 'C374158 Vatican Council',
        tag: '611',
      };
      const createdRecordIDs = [];

      before('Creating user, importing and linking records', () => {
        cy.getAdminToken();
        // make sure there are no duplicate authority records in the system
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C374158*');

        marcFiles.forEach((marcFile) => {
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              createdRecordIDs.push(record[marcFile.propertyName].id);
            });
          });
        });

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        ])
          .then((createdUserProperties) => {
            testData.userProperties = createdUserProperties;

            cy.waitForAuthRefresh(() => {
              cy.loginAsAdmin({
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            }, 20_000).then(() => {
              InventoryInstances.searchByTitle(createdRecordIDs[0]);
              InventoryInstances.selectInstance();
              InventoryInstance.editMarcBibliographicRecord();
              InventoryInstance.verifyAndClickLinkIcon(testData.tag611);
              MarcAuthorities.switchToSearch();
              InventoryInstance.verifySelectMarcAuthorityModal();
              InventoryInstance.searchResults(linkingTagAndValue.value);
              InventoryInstance.clickLinkButton();
              QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
                linkingTagAndValue.tag,
                linkingTagAndValue.rowIndex,
              );
              QuickMarcEditor.saveAndCloseWithValidationWarnings();
              QuickMarcEditor.checkAfterSaveAndClose();
              cy.wait(3_000);
            });
          })
          .then(() => {
            cy.waitForAuthRefresh(() => {
              cy.login(testData.userProperties.username, testData.userProperties.password, {
                path: TopMenu.marcAuthorities,
                waiter: MarcAuthorities.waitLoading,
              });
            }, 20_000);
          });
      });

      after('Deleting user, data', () => {
        cy.getAdminToken().then(() => {
          Users.deleteViaApi(testData.userProperties.userId);
          createdRecordIDs.forEach((id, index) => {
            if (index) MarcAuthority.deleteViaAPI(id);
            else InventoryInstance.deleteInstanceViaApi(id);
          });
        });
      });

      it(
        'C374158 Edit "1XX" field value of linked "MARC Authority" record (without "010" field) (spitfire) (TaaS)',
        { tags: ['extendedPath', 'spitfire', 'C374158'] },
        () => {
          MarcAuthorities.searchBy('Keyword', marcFiles[1].authorityHeading);
          MarcAuthorities.selectTitle(marcFiles[1].authorityHeading);
          MarcAuthority.edit();
          cy.wait(2000);
          QuickMarcEditor.updateExistingField(testData.tag111, testData.updatedValue);
          QuickMarcEditor.checkButtonsEnabled();
          QuickMarcEditor.saveAndCloseUpdatedLinkedBibField();
          QuickMarcEditor.cancelUpdateLinkedBibs();
          QuickMarcEditor.saveAndCloseUpdatedLinkedBibField();
          QuickMarcEditor.closeModalWithEscapeKey();
          QuickMarcEditor.checkUpdateLinkedBibModalAbsent();
          QuickMarcEditor.saveAndCloseUpdatedLinkedBibField();
          QuickMarcEditor.confirmUpdateLinkedBibs(1);
          MarcAuthorities.closeMarcViewPane();
          MarcAuthorities.searchBy('Keyword', marcFiles[1].updatedAuthorityHeading);
          MarcAuthorities.checkResultList([marcFiles[1].updatedAuthorityHeading]);
          MarcAuthorities.verifyNumberOfTitles(5, '1');
          MarcAuthorities.clickOnNumberOfTitlesLink(5, '1');
          InventoryInstance.waitInstanceRecordViewOpened(marcFiles[0].instanceTitle);
          InventoryInstance.viewSource();
          InventoryViewSource.contains(`${testData.marcAuthIcon}\n\t${testData.tag611}\t`);
          InventoryViewSource.contains(
            '$a C374158 Vatican Council $n (2nd : $d 1962-1966 : $c Basilica di San Pietro in Vaticano)',
          );
        },
      );
    });
  });
});
