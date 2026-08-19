import { ACCEPTED_DATA_TYPE_NAMES, EXISTING_RECORD_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import ExportFileHelper from '../../../support/fragments/data-export/exportFile';
import DataExportLogs from '../../../support/fragments/data-export/dataExportLogs';
import DataExportResults from '../../../support/fragments/data-export/dataExportResults';
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
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import NewMatchProfile from '../../../support/fragments/settings/dataImport/matchProfiles/newMatchProfile';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import { getLongDelay } from '../../../support/utils/cypressTools';
import parseMrcFileContentAndVerify from '../../../support/utils/parseMrcFileContent';
import getRandomPostfix, { getRandomLetters } from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Authority files', () => {
    const randomPostfix = getRandomPostfix();
    const randomLetters = getRandomLetters(15);

    const authorityHeading = `AT_C374172_MarcAuthority_${randomPostfix}`;
    // $t value uses unique prefix so 't${tVariation}' replacement is unambiguous
    const tVariation = `AT_C374172_Variations_${randomPostfix}`;
    const bibTitle = `AT_C374172_MarcBibInstance_${randomPostfix}`;
    const naturalId = `${randomLetters}374172`;

    const authorityUUIDsFileName = `AT_C374172_authorityUUIDs_${randomPostfix}.csv`;
    const defaultAuthorityExportProfile = 'Default authority';

    const mappingProfile = {
      name: `AT_C374172 Update MARC authority records by matching 999 ff $s ${randomPostfix}`,
    };
    const actionProfile = {
      name: `AT_C374172 Update MARC authority records by matching 999 ff $s ${randomPostfix}`,
      action: 'UPDATE',
      folioRecordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
    };
    const matchProfile = {
      profileName: `AT_C374172 Update MARC authority records by matching 999 ff $s ${randomPostfix}`,
      incomingRecordFields: { field: '999', in1: 'f', in2: 'f', subfield: 's' },
      existingRecordFields: { field: '999', in1: 'f', in2: 'f', subfield: 's' },
      recordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `AT_C374172 Update MARC authority records by matching 999 ff $s ${randomPostfix}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    const marcAuthFields = [
      {
        tag: '100',
        content: `$a ${authorityHeading} $t ${tVariation}`,
        indicators: ['1', '\\'],
      },
    ];

    const marcBibFields = [
      { tag: '008', content: QuickMarcEditor.valid008ValuesInstance },
      { tag: '240', content: '$a Field240', indicators: ['1', '0'] },
      { tag: '245', content: `$a ${bibTitle}`, indicators: ['1', '1'] },
    ];

    let user;
    let authorityId;
    let bibId;
    let exportedFileName;
    let editedMarcFileName;

    before('Create test data, job profiles, login', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C374172_');
      InventoryInstances.deleteInstanceByTitleViaApi('C374172_');

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

        // Create update job profile chain: FMP → AP → MP → JP
        NewFieldMappingProfile.createMappingProfileForUpdateMarcAuthViaApi(mappingProfile)
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
            NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
              jobProfile.profileName,
              matchProfile.id,
              actionProfile.id,
            );
          });

        // Create authority with 100 field containing $t
        MarcAuthorities.createMarcAuthorityViaAPI(naturalId, '', marcAuthFields).then((id) => {
          authorityId = id;
        });

        // Create MARC bib
        cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
          (id) => {
            bibId = id;
          },
        );

        // Link bib 240 to authority 100
        cy.then(() => {
          QuickMarcEditor.linkMarcRecordsViaApi({
            bibId,
            authorityIds: [authorityId],
            bibFieldTags: ['240'],
            authorityFieldTags: ['100'],
            finalBibFieldContents: [`$a ${tVariation}`],
          });
        });

        // Create authority UUIDs CSV in fixtures and login to Data Export
        cy.then(() => {
          FileManager.createFile(`cypress/fixtures/${authorityUUIDsFileName}`, authorityId);

          cy.login(user.username, user.password, {
            path: TopMenu.dataExportPath,
            waiter: DataExportLogs.waitLoading,
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user?.userId);
      if (authorityId) MarcAuthority.deleteViaAPI(authorityId, true);
      if (bibId) InventoryInstance.deleteInstanceViaApi(bibId);
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
      SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      FileManager.deleteFile(`cypress/fixtures/${authorityUUIDsFileName}`);
      if (editedMarcFileName) FileManager.deleteFile(`cypress/fixtures/${editedMarcFileName}`);
      if (exportedFileName) FileManager.deleteFileFromDownloadsByMask(exportedFileName);
    });

    it(
      'C374172 Update "1XX" field value (delete "$t") of linked "MARC Authority" record (promin)',
      { tags: ['extendedPath', 'promin', 'C374172'] },
      () => {
        // Steps 1-4: Export authority record to .mrc via Data Export
        ExportFileHelper.uploadFile(authorityUUIDsFileName);
        ExportFileHelper.exportWithDefaultJobProfile(
          authorityUUIDsFileName,
          defaultAuthorityExportProfile,
          'Authorities',
        );

        cy.intercept(/\/data-export\/job-executions\?query=status=\(COMPLETED/).as('getExportInfo');
        cy.wait('@getExportInfo', getLongDelay()).then(({ response }) => {
          const { jobExecutions } = response.body;
          const jobData = jobExecutions.find(({ runBy }) => runBy.userId === user.userId);
          exportedFileName = `${authorityUUIDsFileName.replace('.csv', '')}-${jobData.hrId}.mrc`;
          editedMarcFileName = `C374172_edited_${randomPostfix}.mrc`;

          DataExportResults.verifySuccessExportResultCells(
            exportedFileName,
            1,
            jobData.hrId,
            user.username,
            defaultAuthorityExportProfile,
          );

          // Step 4: Download and verify authority UUID is in 999 ff field
          DataExportLogs.clickButtonWithText(exportedFileName);
          parseMrcFileContentAndVerify(
            exportedFileName,
            [
              {
                uuid: authorityId,
                assertions: [
                  (record) => expect([
                    record.get('999')[0].subf[0][1],
                    record.get('999')[0].subf[1][1],
                  ]).to.include(authorityId),
                ],
              },
            ],
            1,
            false,
          );

          // Copy .mrc from downloads to fixtures for editing
          cy.readFile(`cypress/downloads/${exportedFileName}`, 'binary').then((content) => {
            cy.writeFile(`cypress/fixtures/${editedMarcFileName}`, content, 'binary');
          });

          // Steps 5-7: Delete $t subfield by changing 't${tVariation}' → 'b${tVariation}'
          cy.then(() => {
            DataImport.editMarcFile(
              editedMarcFileName,
              editedMarcFileName,
              [`t${tVariation}`],
              [`b${tVariation}`],
            );
          });

          // Steps 8-9: Import updated .mrc via API with 999 ff $s update job profile
          cy.getToken(user.username, user.password);
          DataImport.uploadFileViaApi(
            editedMarcFileName,
            editedMarcFileName,
            jobProfile.profileName,
          );

          // Steps 10-12: Navigate to MARC Authority app — verify heading has no $t, "Number of titles" is blank
          cy.visit(TopMenu.marcAuthorities);
          MarcAuthorities.waitLoading();
          MarcAuthorities.searchBeats(authorityHeading);
          MarcAuthorities.verifyEmptyNumberOfTitlesForRowWithValue(
            `${authorityHeading} ${tVariation}`,
          );
          MarcAuthorities.selectTitle(`${authorityHeading} ${tVariation}`);
          MarcAuthority.contains(`${authorityHeading} ${tVariation}`);
          MarcAuthority.contains('$b');
          MarcAuthority.notContains('$t');

          // Steps 13-15: Navigate to Inventory — verify bib 240 field is unlinked
          cy.visit(TopMenu.inventoryPath);
          InventoryInstances.waitContentLoading();
          InventoryInstances.searchByTitle(bibId);
          InventoryInstances.selectInstanceById(bibId);
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.verifyTagFieldAfterUnlinkingByTag(
            marcBibFields[1].tag,
            marcBibFields[1].indicators[0],
            marcBibFields[1].indicators[1],
            `$a ${tVariation} $0 ${naturalId}`,
          );
        });
      },
    );
  });
});
