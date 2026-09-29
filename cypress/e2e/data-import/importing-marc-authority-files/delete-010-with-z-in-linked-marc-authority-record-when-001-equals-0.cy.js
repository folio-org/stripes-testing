import { ACCEPTED_DATA_TYPE_NAMES, EXISTING_RECORD_NAMES } from '../../../support/constants';
import Permissions from '../../../support/dictionary/permissions';
import DataImport from '../../../support/fragments/data_import/dataImport';
import ExportFile from '../../../support/fragments/data-export/exportFile';
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
import getRandomPostfix, { randomNDigitNumber } from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Authority files', () => {
    const randomPostfix = getRandomPostfix();
    const randomDigits = randomNDigitNumber(15);

    const authorityHeading = `AT_C376952_MarcAuthority_${randomPostfix} 1950-2022 SubCAuth`;
    const authorityField100Content = `$a AT_C376952_MarcAuthority_${randomPostfix} $d 1950-2022 $c SubCAuth`;
    const naturalId = `${randomDigits}376952`;
    const zValue = `${randomDigits}0376952`;
    const bibTitle = `AT_C376952_MarcBibInstance_${randomPostfix}`;
    const bibField800OriginalContent =
      '$a AT_C376952_Bib800 $d 1950- $t Inspector Banks series $v 24. $y 2023 $8 800';

    const csvFile = `AT_C376952_authorityUUIDs_${randomPostfix}.csv`;
    const exportedMarcFile = `AT_C376952_exportedMarcFile_${randomPostfix}.mrc`;
    const editedMarcFile = `AT_C376952_editedMarcFile_${randomPostfix}.mrc`;

    const mappingProfile = { name: `AT_C376952_MappingProfile_${randomPostfix}` };
    const actionProfile = {
      name: `AT_C376952_ActionProfile_${randomPostfix}`,
      action: 'UPDATE',
      folioRecordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
    };
    const matchProfile = {
      profileName: `AT_C376952_MatchProfile_${randomPostfix}`,
      incomingRecordFields: { field: '999', in1: 'f', in2: 'f', subfield: 's' },
      existingRecordFields: { field: '999', in1: 'f', in2: 'f', subfield: 's' },
      recordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `AT_C376952 Update MARC authority records by matching 999 ff $s ${randomPostfix}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    // The authority record already HAS a "010 $z" field - it's removed by the reimport
    const marcAuthFields = [
      { tag: '100', content: authorityField100Content, indicators: ['1', '\\'] },
      { tag: '010', content: `$z ${zValue}`, indicators: ['\\', '\\'] },
    ];

    const marcBibFields = [
      { tag: '008', content: QuickMarcEditor.valid008ValuesInstance },
      { tag: '245', content: `$a ${bibTitle}`, indicators: ['1', '1'] },
      { tag: '800', content: bibField800OriginalContent, indicators: ['1', '\\'] },
    ];

    const bibField800AfterLinking = {
      tag: marcBibFields[2].tag,
      ind1: marcBibFields[2].indicators[0],
      ind2: marcBibFields[2].indicators[1],
      alphaContr: `$a AT_C376952_MarcAuthority_${randomPostfix} $d 1950-2022 $c SubCAuth`,
      alphaNotContr: '$v 24. $y 2023',
      digitContr: `$0 ${naturalId}`,
      digitNotContr: '$8 800',
    };

    let user;
    let authorityId;
    let bibId;

    before('Create test data, job profiles, login', () => {
      cy.getAdminToken(false);
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C376952_');
      InventoryInstances.deleteInstanceByTitleViaApi('C376952_');

      cy.then(() => {
        NewFieldMappingProfile.createMappingProfileForUpdateMarcAuthViaApi(mappingProfile).then(
          (mappingProfileResponse) => {
            mappingProfile.id = mappingProfileResponse.body.id;
          },
        );
      })
        .then(() => {
          NewActionProfile.createActionProfileViaApi(actionProfile, mappingProfile.id).then(
            (actionProfileResponse) => {
              actionProfile.id = actionProfileResponse.body.id;
            },
          );
        })
        .then(() => {
          NewMatchProfile.createMatchProfileWithIncomingAndExistingRecordsViaApi(matchProfile).then(
            (matchProfileResponse) => {
              matchProfile.id = matchProfileResponse.body.id;
            },
          );
        })
        .then(() => {
          NewJobProfile.createJobProfileWithLinkedMatchAndActionProfilesViaApi(
            jobProfile.profileName,
            matchProfile.id,
            actionProfile.id,
          );
        })
        .then(() => {
          MarcAuthorities.createMarcAuthorityViaAPI(naturalId, '', marcAuthFields).then((id) => {
            authorityId = id;
          });
        })
        .then(() => {
          cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
            (id) => {
              bibId = id;
            },
          );
        })
        .then(() => {
          QuickMarcEditor.linkMarcRecordsViaApi({
            bibId,
            authorityIds: [authorityId],
            bibFieldTags: ['800'],
            authorityFieldTags: ['100'],
            finalBibFieldContents: [
              `${bibField800AfterLinking.alphaContr}${bibField800AfterLinking.alphaNotContr}${bibField800AfterLinking.digitNotContr}`,
            ],
          });
        })
        .then(() => {
          FileManager.createFile(`cypress/fixtures/${csvFile}`, authorityId);
        })
        .then(() => {
          ExportFile.exportFileViaApi(
            csvFile,
            'authority',
            'Default authority export job profile',
          ).then(() => {
            ExportFile.downloadExportedMarcFile(exportedMarcFile);
          });
        })
        .then(() => {
          cy.readFile(`cypress/downloads/${exportedMarcFile}`, 'binary').then((content) => {
            cy.writeFile(`cypress/fixtures/${exportedMarcFile}`, content, 'binary');
          });
        })
        .then(() => {
          // Remove the "010" field with "$z" - the field-length change requires the
          // marcjs-based editor, not the plain text-replace one
          DataImport.editMarcFieldsInAllRecords(exportedMarcFile, editedMarcFile, {
            removeTags: ['010'],
          });
        })
        .then(() => {
          cy.createTempUser([
            Permissions.moduleDataImportEnabled.gui,
            Permissions.inventoryAll.gui,
            Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
            Permissions.uiQuickMarcQuickMarcAuthoritiesEditorAll.gui,
            Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
            Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
          ]).then((userProperties) => {
            user = userProperties;

            // Steps 8-10: import the edited file via the Update job profile
            cy.getToken(user.username, user.password);
            DataImport.uploadFileViaApi(editedMarcFile, editedMarcFile, jobProfile.profileName);

            cy.login(user.username, user.password, {
              path: TopMenu.marcAuthorities,
              waiter: MarcAuthorities.waitLoading,
            });
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(user?.userId);
      if (authorityId) MarcAuthority.deleteViaAPI(authorityId, true);
      if (bibId) InventoryInstance.deleteInstanceViaApi(bibId);
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.profileName);
      SettingsMatchProfiles.deleteMatchProfileByNameViaApi(matchProfile.profileName);
      SettingsActionProfiles.deleteActionProfileByNameViaApi(actionProfile.name);
      SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(mappingProfile.name);
      FileManager.deleteFile(`cypress/fixtures/${csvFile}`);
      FileManager.deleteFile(`cypress/fixtures/${exportedMarcFile}`);
      FileManager.deleteFile(`cypress/fixtures/${editedMarcFile}`);
      FileManager.deleteFile(`cypress/downloads/${exportedMarcFile}`);
    });

    it(
      'C376952 Delete "010" with "$z" in linked "MARC Authority" record when "001" = "$0" (promin)',
      { tags: ['extendedPath', 'promin', 'C376952'] },
      () => {
        // Step 11: MARC Authority app - Keyword search by the 1XX heading
        MarcAuthorities.searchBeats(authorityHeading);
        MarcAuthorities.verifyNumberOfTitlesForRowWithValue(authorityHeading, '1');

        // Step 12: detail view does NOT have the "010" field anymore
        MarcAuthorities.selectTitle(authorityHeading);
        MarcAuthority.notContains(zValue);

        // Step 13: close detail view - Number of titles still shown
        MarcAuthorities.closeMarcViewPane();
        MarcAuthorities.verifyNumberOfTitlesForRowWithValue(authorityHeading, '1');

        // Step 14: click "Number of titles" - the linked Instance is shown
        MarcAuthorities.clickNumberOfTitlesByHeading(authorityHeading);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened(bibTitle);

        // Step 15: edit the MARC bibliographic record
        InventoryInstance.editMarcBibliographicRecord();
        QuickMarcEditor.waitLoading();

        // Step 16: linked "800" field was NOT updated - only $v/$y/$8 stay editable
        QuickMarcEditor.verifyTagFieldAfterLinkingByTag(...Object.values(bibField800AfterLinking));
      },
    );
  });
});
