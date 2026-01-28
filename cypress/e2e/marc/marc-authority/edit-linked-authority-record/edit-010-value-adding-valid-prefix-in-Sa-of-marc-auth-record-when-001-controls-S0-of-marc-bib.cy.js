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
      let userData;

      const marcBibRecordData = {
        tag100: 100,
        rowIndex: 15,
        sectionId: 'list-contributors',
      };

      const marcAuthRecordData = {
        rowIndex: 4,
        tag010: '010',
        searchOption: 'Keyword',
        searchValue: 'C422066 Kerouac, Jack',
        tag010Value: '$a 80036674',
        newTag010Value: '$a n80036674',
        numberOfTitlesColumnIndex: 5,
        numberOfTitles: '1',
        authorityHeading: 'C422066 Kerouac, Jack (001 has valid prefix), 1922-1969',
        tag001$0Value: '971255',
        callOut:
          'This record has successfully saved and is in process. 1 linked bibliographic record(s) updates have begun.',
      };

      const viewSourceData = [
        'Linked to MARC authority',
        '100',
        '$a C422066 Kerouac, Jack (001 has valid prefix), $d 1922-1969 $e author. $0 http://id.loc.gov/authorities/names/n80036674',
      ];

      const marcFiles = [
        {
          marc: 'marcBibFileForC422066.mrc',
          fileName: `testMarcFileC422066${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_INSTANCE_AND_SRS,
          numOfRecords: 1,
          propertyName: 'instance',
        },
        {
          marc: 'marcAuthFileForC422066.mrc',
          fileName: `testMarcFileC422066${getRandomPostfix()}.mrc`,
          jobProfileToRun: DEFAULT_JOB_PROFILE_NAMES.CREATE_AUTHORITY,
          numOfRecords: 1,
          propertyName: 'authority',
        },
      ];

      const createdAuthorityIDs = [];

      before('Creating user and data', () => {
        cy.getAdminToken();
        // make sure there are no duplicate records in the system
        MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C422066*');

        marcFiles.forEach((marcFile) => {
          DataImport.uploadFileViaApi(
            marcFile.marc,
            marcFile.fileName,
            marcFile.jobProfileToRun,
          ).then((response) => {
            response.forEach((record) => {
              createdAuthorityIDs.push(record[marcFile.propertyName].id);
            });
          });
        });

        cy.createTempUser([
          Permissions.inventoryAll.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
          Permissions.uiMarcAuthoritiesAuthorityRecordEdit.gui,
          Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
          Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
          Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        ]).then((createdUserProperties) => {
          userData = createdUserProperties;

          cy.loginAsAdmin().then(() => {
            cy.visit(TopMenu.inventoryPath);
            InventoryInstances.searchByTitle(createdAuthorityIDs[0]);
            InventoryInstances.selectInstance();
            InventoryInstance.editMarcBibliographicRecord();
            QuickMarcEditor.clickLinkIconInTagField(marcBibRecordData.rowIndex);
            MarcAuthorities.switchToSearch();
            InventoryInstance.verifySelectMarcAuthorityModal();
            InventoryInstance.verifySearchOptions();
            InventoryInstance.searchResults(marcAuthRecordData.authorityHeading);
            InventoryInstance.clickLinkButton();
            QuickMarcEditor.verifyAfterLinkingUsingRowIndex(
              marcBibRecordData.tag100,
              marcBibRecordData.rowIndex,
            );
            QuickMarcEditor.pressSaveAndClose();
            QuickMarcEditor.checkAfterSaveAndClose();
          });

          cy.login(userData.username, userData.password, {
            path: TopMenu.marcAuthorities,
            waiter: MarcAuthorities.waitLoading,
          });
        });
      });

      after('Deleting user, data', () => {
        cy.getAdminToken().then(() => {
          Users.deleteViaApi(userData.userId);
          createdAuthorityIDs.forEach((id, index) => {
            if (index) MarcAuthority.deleteViaAPI(id);
            else InventoryInstance.deleteInstanceViaApi(id);
          });
        });
      });

      it(
        "C422066 Edit '010' value (add valid prefix in '$a') of linked 'MARC authority' record when '001' controls '$0' of MARC bib's field (spitfire) (TaaS)",
        { tags: ['extendedPath', 'spitfire', 'C422066'] },
        () => {
          MarcAuthorities.searchAndVerify(
            marcAuthRecordData.searchOption,
            marcAuthRecordData.searchValue,
          );
          MarcAuthorities.waitLoading();
          MarcAuthority.edit();
          cy.wait(2000);
          QuickMarcEditor.checkContent(marcAuthRecordData.tag010Value, marcAuthRecordData.rowIndex);
          QuickMarcEditor.updateExistingFieldContent(
            marcAuthRecordData.rowIndex,
            marcAuthRecordData.newTag010Value,
          );
          QuickMarcEditor.checkButtonsEnabled();
          QuickMarcEditor.pressSaveAndClose();
          QuickMarcEditor.checkCallout(marcAuthRecordData.callOut);
          MarcAuthorities.closeMarcViewPane();
          MarcAuthorities.verifyNumberOfTitles(
            marcAuthRecordData.numberOfTitlesColumnIndex,
            marcAuthRecordData.numberOfTitles,
          );
          MarcAuthorities.clickOnNumberOfTitlesLink(
            marcAuthRecordData.numberOfTitlesColumnIndex,
            marcAuthRecordData.numberOfTitles,
          );
          InventoryInstance.waitInventoryLoading();
          InventoryInstance.checkAuthorityAppIconLink(
            marcBibRecordData.sectionId,
            marcAuthRecordData.authorityHeading,
            createdAuthorityIDs[1],
          );
          InventoryInstance.viewSource();
          viewSourceData.forEach((text) => InventoryViewSource.contains(text));
        },
      );
    });
  });
});
