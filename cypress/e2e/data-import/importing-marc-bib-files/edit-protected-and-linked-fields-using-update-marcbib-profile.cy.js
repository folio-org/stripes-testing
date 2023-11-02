import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import MatchProfiles from '../../../support/fragments/data_import/match_profiles/matchProfiles';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import InventorySearchAndFilter from '../../../support/fragments/inventory/inventorySearchAndFilter';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import TopMenu from '../../../support/fragments/topMenu';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import Users from '../../../support/fragments/users/users';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import MarcFieldProtection from '../../../support/fragments/settings/dataImport/marcFieldProtection';
import Parallelization from '../../../support/dictionary/parallelization';
import {
  LOCATION_NAMES,
  FOLIO_RECORD_TYPE,
  ACCEPTED_DATA_TYPE_NAMES,
  EXISTING_RECORDS_NAMES,
} from '../../../support/constants';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';

describe('data-import', () => {
  describe('Importing MARC Bib files', () => {
    const testData = {};
    let firstFieldId = null;
    let secondFieldId = null;
    let thirdFieldId = null;
    // unique file name to upload
    const nameForUpdatedMarcFile = `C380511autotestFile${getRandomPostfix()}.mrc`;
    const nameForExportedMarcFile = `C380511autotestFile${getRandomPostfix()}.mrc`;
    const nameForCSVFile = `C380511autotestFile${getRandomPostfix()}.csv`;
    const mappingProfile = {
      name: 'Update MARC Bib records by matching 999 ff $s subfield value',
      typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
      update: true,
      permanentLocation: `"${LOCATION_NAMES.ANNEX}"`,
    };
    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.MARCBIBLIOGRAPHIC,
      name: 'Update MARC Bib records by matching 999 ff $s subfield value',
      action: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
    };
    const matchProfile = {
      profileName: 'Update MARC Bib records by matching 999 ff $s subfield value',
      incomingRecordFields: {
        field: '999',
        in1: 'f',
        in2: 'f',
        subfield: 's',
      },
      existingRecordFields: {
        field: '999',
        in1: 'f',
        in2: 'f',
        subfield: 's',
      },
      matchCriterion: 'Exactly matches',
      existingRecordType: EXISTING_RECORDS_NAMES.MARC_BIBLIOGRAPHIC,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: 'Update MARC Bib records by matching 999 ff $s subfield value',
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };
    const protectedFields = {
      firstField: '100',
      secondField: '240',
      thirdField: '700',
    };
    const marcFiles = [
      {
        marc: 'marcBibFileForC380511.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create instance and SRS MARC Bib',
        numOfRecords: 1,
      },
      {
        marc: 'marcFileForC380511.mrc',
        fileName: `testMarcFile.${getRandomPostfix()}.mrc`,
        jobProfileToRun: 'Default - Create SRS MARC Authority',
        numOfRecords: 4,
      },
    ];
    const linkingTagAndValues = [
      {
        rowIndex: 17,
        value: 'Ludwig van, Beethoven, 1770-1827.',
        tag: '100',
      },
      {
        rowIndex: 18,
        value:
          'Beethoven, Ludwig van, 1770-1827 Variations, piano, violin, cello, op. 44, E♭ major',
        tag: '240',
      },
      {
        rowIndex: 41,
        value: 'Music piano',
        tag: '650',
      },
      {
        rowIndex: 50,
        value: 'Hewitt, Angela, 1958-',
        tag: '700',
      },
      {
        rowIndex: 51,
        value: 'Ludwig van, Beethoven, 1770-1827.',
        tag: '700',
      },
    ];
    const createdAuthorityIDs = [];

    before('Creating user', () => {
      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
        Permissions.uiCanLinkUnlinkAuthorityRecordsToBibRecords.gui,
        Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
        Permissions.dataExportEnableApp.gui,
      ]).then((createdUserProperties) => {
        testData.userProperties = createdUserProperties;

        marcFiles.forEach((marcFile) => {
          cy.loginAsAdmin({ path: TopMenu.dataImportPath, waiter: DataImport.waitLoading }).then(
            () => {
              DataImport.uploadFile(marcFile.marc, marcFile.fileName);
              JobProfiles.waitLoadingList();
              JobProfiles.search(marcFile.jobProfileToRun);
              JobProfiles.runImportFile();
              JobProfiles.waitFileIsImported(marcFile.fileName);
              Logs.checkStatusOfJobProfile('Completed');
              Logs.openFileDetails(marcFile.fileName);
              for (let i = 0; i < marcFile.numOfRecords; i++) {
                Logs.getCreatedItemsID(i).then((link) => {
                  createdAuthorityIDs.push(link.split('/')[5]);
                });
              }
            },
          );
        });

        cy.loginAsAdmin().then(() => {
          // create Match profile
          cy.visit(SettingsMenu.matchProfilePath);
          MatchProfiles.createMatchProfile(matchProfile);
          // create Field mapping profile
          cy.visit(SettingsMenu.mappingProfilePath);
          FieldMappingProfiles.createMappingProfileForUpdatesMarc(mappingProfile);
          FieldMappingProfileView.closeViewMode(mappingProfile.name);
          FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);
          // create Action profile and link it to Field mapping profile
          cy.visit(SettingsMenu.actionProfilePath);
          ActionProfiles.create(actionProfile, mappingProfile.name);
          ActionProfiles.checkActionProfilePresented(actionProfile.name);
          // create Job profile
          cy.visit(SettingsMenu.jobProfilePath);
          JobProfiles.openNewJobProfileForm();
          NewJobProfile.fillJobProfile(jobProfile);
          NewJobProfile.linkMatchProfile(matchProfile.profileName);
          NewJobProfile.linkActionProfileByName(actionProfile.name);
          // waiter needed for the action profile to be linked
          cy.wait(1000);
          NewJobProfile.saveAndClose();
          JobProfiles.waitLoadingList();
          JobProfiles.checkJobProfilePresented(jobProfile.profileName);
        });

        cy.loginAsAdmin();
        cy.getAdminToken().then(() => {
          MarcFieldProtection.createViaApi({
            indicator1: '*',
            indicator2: '*',
            subfield: '0',
            data: '*',
            source: 'USER',
            field: protectedFields.firstField,
          }).then((resp) => {
            firstFieldId = resp.id;
          });
          MarcFieldProtection.createViaApi({
            indicator1: '*',
            indicator2: '*',
            subfield: '0',
            data: '*',
            source: 'USER',
            field: protectedFields.secondField,
          }).then((resp) => {
            secondFieldId = resp.id;
          });
          MarcFieldProtection.createViaApi({
            indicator1: '*',
            indicator2: '*',
            subfield: '9',
            data: '*',
            source: 'USER',
            field: protectedFields.thirdField,
          }).then((resp) => {
            thirdFieldId = resp.id;
          });
        });

        cy.login(testData.userProperties.username, testData.userProperties.password, {
          path: TopMenu.inventoryPath,
          waiter: InventoryInstances.waitContentLoading,
        });
      });
    });

    after('delete test data', () => {
      Users.deleteViaApi(testData.userProperties.userId);
      InventoryInstance.deleteInstanceViaApi(createdAuthorityIDs[0]);
      createdAuthorityIDs.forEach((id, index) => {
        if (index) MarcAuthority.deleteViaAPI(id);
      });
      MarcFieldProtection.deleteViaApi(firstFieldId);
      MarcFieldProtection.deleteViaApi(secondFieldId);
      MarcFieldProtection.deleteViaApi(thirdFieldId);
      // clean up generated profiles
      JobProfiles.deleteJobProfile(jobProfile.profileName);
      MatchProfiles.deleteMatchProfile(matchProfile.profileName);
      ActionProfiles.deleteActionProfile(actionProfile.name);
      FieldMappingProfileView.deleteViaApi(mappingProfile.name);
      // delete created files in fixtures
      FileManager.deleteFile(`cypress/fixtures/${nameForExportedMarcFile}`);
      FileManager.deleteFile(`cypress/fixtures/${nameForCSVFile}`);
      FileManager.deleteFile(`cypress/fixtures/${nameForUpdatedMarcFile}`);
    });

    it(
      'C380511 Edit protected and linked fields using update MARC Bib profile (spitfire)',
      { tags: [TestTypes.criticalPath, DevTeams.spitfire, Parallelization.nonParallel] },
      () => {
        InventoryInstance.searchByTitle(createdAuthorityIDs[0]);
        InventoryInstances.selectInstance();
        InventoryInstance.editMarcBibliographicRecord();
        linkingTagAndValues.forEach((linking) => {
          QuickMarcEditor.clickLinkIconInTagField(linking.rowIndex);
          MarcAuthorities.switchToSearch();
          InventoryInstance.verifySelectMarcAuthorityModal();
          InventoryInstance.verifySearchOptions();
          InventoryInstance.searchResults(linking.value);
          InventoryInstance.clickLinkButton();
          QuickMarcEditor.verifyAfterLinkingUsingRowIndex(linking.tag, linking.rowIndex);
        });
        QuickMarcEditor.pressSaveAndClose();
        QuickMarcEditor.checkAfterSaveAndClose();

        // download .csv file
        InventorySearchAndFilter.saveUUIDs();
        ExportFile.downloadCSVFile(nameForCSVFile, 'SearchInstanceUUIDs*');
        FileManager.deleteFolder(Cypress.config('downloadsFolder'));
        cy.visit(TopMenu.dataExportPath);
        // download exported marc file
        ExportFile.uploadFile(nameForCSVFile);
        ExportFile.exportWithDefaultJobProfile(nameForCSVFile);
        ExportFile.downloadExportedMarcFile(nameForExportedMarcFile);
        FileManager.deleteFolder(Cypress.config('downloadsFolder'));
        cy.log('#####End Of Export#####');

        DataImport.editMarcFile(
          nameForExportedMarcFile,
          nameForUpdatedMarcFile,
          [
            'aLudwig van, Beethoven,d1770-1827ecomposer',
            '0id.loc.gov/authorities/names/n83130832',
            'aMusic piano',
            'ewriter of supplementary textual content.',
            'aLudwig van, Beethoven,d1770-1827iContainer of (work):0id.loc.gov/authorities/names/n79107741',
          ],
          [
            'aBeethoven, Ludwig V.d1770-1827eAuthor',
            '0id.loc.gov/authorities/names/n83130833',
            'aMusic pianocTest environment',
            'eauthor of supplementary textual content.',
            'aBeethoven, Ludwig V.d1770-1827iContainer of (work):',
          ],
        );

        // upload the exported marc file with 999.f.f.s fields
        cy.visit(TopMenu.dataImportPath);
        DataImport.uploadFile(nameForUpdatedMarcFile, nameForUpdatedMarcFile);
        JobProfiles.waitLoadingList();
        JobProfiles.search(jobProfile.profileName);
        JobProfiles.runImportFile();
        JobProfiles.waitFileIsImported(nameForUpdatedMarcFile);
        Logs.checkStatusOfJobProfile('Completed');
        Logs.openFileDetails(nameForUpdatedMarcFile);
        Logs.clickOnHotLink(0, 3, 'Updated');
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.verifyTagFieldAfterLinking(
          17,
          '100',
          '1',
          '\\',
          '$a Ludwig van, Beethoven, $d 1770-1827',
          '$e composer.',
          '$0 id.loc.gov/authorities/names/n79107741',
          '',
        );
        QuickMarcEditor.verifyTagFieldAfterLinking(
          18,
          '240',
          '1',
          '0',
          '$a Variations, $m piano, violin, cello, $n op. 44, $r E♭ major',
          '$c Ludwig Van Beethoven.',
          '$0 id.loc.gov/authorities/names/n83130832',
          '',
        );
        QuickMarcEditor.verifyTagFieldAfterLinking(
          41,
          '650',
          '\\',
          '0',
          '$a Music piano',
          '$c Test environment',
          '$0 id.loc.gov/authorities/childrensSubjects/sj2021056711',
          '',
        );
        QuickMarcEditor.verifyTagFieldAfterLinking(
          50,
          '700',
          '1',
          '\\',
          '$a Hewitt, Angela, $d 1958-',
          '$e instrumentalist, $e writer of supplementary textual content.',
          '$0 id.loc.gov/authorities/names/n91099716',
          '',
        );
        QuickMarcEditor.verifyTagFieldAfterLinking(
          51,
          '700',
          '1',
          '2',
          '$a Ludwig van, Beethoven, $d 1770-1827',
          '$i Container of (work):',
          '$0 id.loc.gov/authorities/names/n79107741',
          '',
        );
        QuickMarcEditor.verifyTagFieldAfterUnlinking(
          52,
          '700',
          '1',
          '\\',
          '$a Hewitt, Angela, $d 1958- $e instrumentalist, $e author of supplementary textual content. $0 id.loc.gov/authorities/names/n91099716',
        );
        QuickMarcEditor.verifyTagFieldAfterUnlinking(
          53,
          '700',
          '1',
          '2',
          '$a Beethoven, Ludwig V. $d 1770-1827 $i Container of (work):',
        );
      },
    );
  });
});
