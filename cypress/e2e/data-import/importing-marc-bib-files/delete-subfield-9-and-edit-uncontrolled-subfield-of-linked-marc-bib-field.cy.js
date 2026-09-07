import { EXISTING_RECORD_NAMES } from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import ExportFile from '../../../support/fragments/data-export/exportFile';
import DataImport from '../../../support/fragments/data_import/dataImport';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import MarcAuthorities from '../../../support/fragments/marcAuthority/marcAuthorities';
import MarcAuthority from '../../../support/fragments/marcAuthority/marcAuthority';
import QuickMarcEditor from '../../../support/fragments/quickMarcEditor';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
  MatchProfiles as SettingsMatchProfiles,
} from '../../../support/fragments/settings/dataImport';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix, { randomNDigitNumber } from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    const testData = {};
    const randomPostfix = getRandomPostfix();
    const naturalId = `n${randomNDigitNumber(15)}375104`;
    const authorityHeading = `AT_C375104_MarcAuthority_${randomPostfix}`;
    const marcBibTitle = `AT_C375104_MarcBibInstance_${randomPostfix}`;
    const sourceUrlPrefix = 'http://id.loc.gov/authorities/names/';
    const csvFileName = `AT_C375104_exportList_${randomPostfix}.csv`;
    const exportedMarcFileName = `AT_C375104_exportedMarc_${randomPostfix}.mrc`;
    const updatedMarcFileName = `AT_C375104_updatedMarc_${randomPostfix}.mrc`;
    const oldSubfieldEValue = 'author';
    const newSubfieldEValue = 'Narrator';

    const marcAuthFields = [
      { tag: '100', content: `$a ${authorityHeading},`, indicators: ['1', '\\'] },
    ];

    const marcBibFields = [
      { tag: '008', content: QuickMarcEditor.valid008ValuesInstance },
      { tag: '100', content: `$a ${authorityHeading} $e author.`, indicators: ['1', '\\'] },
      { tag: '245', content: `$a ${marcBibTitle}`, indicators: ['1', '1'] },
    ];

    const mappingProfile = { name: `AT_C375104_MappingProfile_${randomPostfix}` };
    const actionProfile = {
      name: `AT_C375104_ActionProfile_${randomPostfix}`,
      action: 'UPDATE',
      folioRecordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
    };
    const matchProfile = {
      profileName: `AT_C375104_MatchProfile_${randomPostfix}`,
      incomingRecordFields: { field: '999', in1: 'f', in2: 'f', subfield: 's' },
      existingRecordFields: { field: '999', in1: 'f', in2: 'f', subfield: 's' },
      recordType: EXISTING_RECORD_NAMES.MARC_BIBLIOGRAPHIC,
    };
    const jobProfile = { profileName: `AT_C375104_JobProfile_${randomPostfix}` };

    before('Create test data via API', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C375104_');
      InventoryInstances.deleteInstanceByTitleViaApi('C375104_');

      MarcAuthorities.createMarcAuthorityViaAPI(naturalId, '', marcAuthFields)
        .then((id) => {
          testData.authorityId = id;
          return cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields);
        })
        .then((instanceId) => {
          testData.bibId = instanceId;
        })
        .then(() => {
          QuickMarcEditor.linkMarcRecordsViaApi({
            bibId: testData.bibId,
            authorityIds: [testData.authorityId],
            bibFieldTags: ['100'],
            authorityFieldTags: ['100'],
            finalBibFieldContents: [`$a ${authorityHeading} $e ${oldSubfieldEValue}`],
          });
        })
        .then(() => {
          return FileManager.createFile(`cypress/fixtures/${csvFileName}`, testData.bibId);
        })
        .then(() => {
          return ExportFile.exportFileViaApi(csvFileName).then(() => {
            ExportFile.downloadExportedMarcFile(exportedMarcFileName);
          });
        })
        .then(() => {
          // Remove $9 (authority link ID) and change $e from "author." to "Narrator"
          DataImport.editMarcFile(
            exportedMarcFileName,
            updatedMarcFileName,
            [`e${oldSubfieldEValue}`, `\x1f9${testData.authorityId}`],
            [`e${newSubfieldEValue}`, ''],
          );
        })
        .then(() => {
          return NewFieldMappingProfile.createMappingProfileForUpdateMarcBibViaApi(mappingProfile)
            .then((fmpResponse) => {
              mappingProfile.id = fmpResponse.body.id;
              return NewActionProfile.createActionProfileViaApi(actionProfile, mappingProfile.id);
            })
            .then((apResponse) => {
              actionProfile.id = apResponse.body.id;
              return NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(
                matchProfile,
              );
            })
            .then((mpResponse) => {
              matchProfile.id = mpResponse.body.id;
              return NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
                jobProfile.profileName,
                matchProfile.id,
                actionProfile.id,
              );
            });
        })
        .then(() => {
          return DataImport.uploadFileViaApi(
            updatedMarcFileName,
            updatedMarcFileName,
            jobProfile.profileName,
          );
        })
        .then(() => {
          return cy
            .createTempUser([
              Permissions.inventoryAll.gui,
              Permissions.moduleDataImportEnabled.gui,
              Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
              Permissions.uiQuickMarcQuickMarcAuthorityLinkUnlink.gui,
              Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
              Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
            ])
            .then((userProperties) => {
              testData.user = userProperties;
              cy.login(testData.user.username, testData.user.password, {
                path: TopMenu.inventoryPath,
                waiter: InventoryInstances.waitContentLoading,
              });
            });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(testData.user?.userId);
      if (testData.authorityId) MarcAuthority.deleteViaAPI(testData.authorityId, true);
      if (testData.bibId) InventoryInstance.deleteInstanceViaApi(testData.bibId);
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
      SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      FileManager.deleteFile(`cypress/fixtures/${csvFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${exportedMarcFileName}`);
      FileManager.deleteFile(`cypress/fixtures/${updatedMarcFileName}`);
      FileManager.deleteFile(`cypress/downloads/${exportedMarcFileName}`);
    });

    it(
      'C375104 Delete subfield "$9" and edit uncontrolled subfield of linked "MARC Bib" field which is controlled by "MARC Authority" record (promin)',
      { tags: ['extendedPath', 'promin', 'C375104'] },
      () => {
        // Step 13: Search for updated instance; verify Contributors shows MARC Authority icon
        InventoryInstances.searchByTitle(testData.bibId);
        InventoryInstances.selectInstanceById(testData.bibId);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InventoryInstance.verifyContributorWithMarcAppLink(0, 1, authorityHeading);
        InventoryInstance.verifyContributorWithMarcAppLink(0, 2, newSubfieldEValue);

        // Step 14: Open MARC bibliographic editor
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.waitLoading();

        // Step 15: Verify 100 field still linked; $e changed to Narrator; $9 removed
        QuickMarcEditor.verifyTagFieldAfterLinkingByTag(
          marcBibFields[1].tag,
          marcBibFields[1].indicators[0],
          marcBibFields[1].indicators[1],
          `$a ${authorityHeading}`,
          `$e ${newSubfieldEValue}`,
          `$0 ${sourceUrlPrefix}${naturalId}`,
          '',
        );
      },
    );
  });
});
