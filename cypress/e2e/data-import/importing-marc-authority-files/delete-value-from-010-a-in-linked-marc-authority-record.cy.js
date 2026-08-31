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
import getRandomPostfix, { randomNDigitNumber } from '../../../support/utils/stringTools';

describe('Data Import', () => {
  describe('Importing MARC Authority files', () => {
    const randomPostfix = getRandomPostfix();
    const randomDigits = randomNDigitNumber(15);

    const authorityHeading = `AT_C376943_MarcAuthority_${randomPostfix}`;
    const naturalId = `n${randomDigits}376943`;
    const bibTitle = `AT_C376943_MarcBibInstance_${randomPostfix}`;

    const authorityUUIDsFileName = `AT_C376943_authorityUUIDs_${randomPostfix}.csv`;
    const defaultAuthorityExportProfile = 'Default authority';

    const mappingProfile = {
      name: `AT_C376943 Update MARC authority records by matching 999 ff $s ${randomPostfix}`,
    };
    const actionProfile = {
      name: `AT_C376943 Update MARC authority records by matching 999 ff $s ${randomPostfix}`,
      action: 'UPDATE',
      folioRecordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
    };
    const matchProfile = {
      profileName: `AT_C376943 Update MARC authority records by matching 999 ff $s ${randomPostfix}`,
      incomingRecordFields: { field: '999', in1: 'f', in2: 'f', subfield: 's' },
      existingRecordFields: { field: '999', in1: 'f', in2: 'f', subfield: 's' },
      recordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `AT_C376943 Update MARC authority records by matching 999 ff $s ${randomPostfix}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    const marcAuthFields = [
      { tag: '010', content: `$a ${naturalId}`, indicators: ['\\', '\\'] },
      { tag: '110', content: `$a ${authorityHeading}`, indicators: ['2', '\\'] },
    ];

    const marcBibFields = [
      { tag: '008', content: QuickMarcEditor.valid008ValuesInstance },
      { tag: '245', content: `$a ${bibTitle}`, indicators: ['1', '1'] },
      { tag: '710', content: '$a Field710', indicators: ['2', '0'] },
    ];

    let user;
    let authorityId;
    let bibId;
    let exportedFileName;
    let editedMarcFileName;

    before('Create test data, job profiles, login', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C376943_');
      InventoryInstances.deleteInstanceByTitleViaApi('C376943_');

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.dataExportUploadExportDownloadFileViewLogs.gui,
        Permissions.uiMarcAuthoritiesAuthorityRecordView.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiQuickMarcQuickMarcBibliographicEditorAll.gui,
      ]).then((userProperties) => {
        user = userProperties;

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

        MarcAuthorities.createMarcAuthorityViaAPI(
          naturalId.replace('n', ''),
          '',
          marcAuthFields,
        ).then((id) => {
          authorityId = id;
        });

        cy.createMarcBibliographicViaAPI(QuickMarcEditor.defaultValidLdr, marcBibFields).then(
          (id) => {
            bibId = id;
          },
        );

        cy.then(() => {
          QuickMarcEditor.linkMarcRecordsViaApi({
            bibId,
            authorityIds: [authorityId],
            bibFieldTags: ['710'],
            authorityFieldTags: ['110'],
            finalBibFieldContents: [`$a ${authorityHeading}`],
          });
        });

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
      'C376943 Delete value from "010 $a" in linked "MARC Authority" record when "010" = "$0" (promin)',
      { tags: ['extendedPath', 'promin', 'C376943'] },
      () => {
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
          editedMarcFileName = `C376943_edited_${randomPostfix}.mrc`;

          DataExportResults.verifySuccessExportResultCells(
            exportedFileName,
            1,
            jobData.hrId,
            user.username,
            defaultAuthorityExportProfile,
          );

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

          cy.readFile(`cypress/downloads/${exportedFileName}`, 'binary').then((content) => {
            cy.writeFile(`cypress/fixtures/${editedMarcFileName}`, content, 'binary');
          });

          // Steps 5-7: Delete only the VALUE of $a — keep subfield code, leave it empty
          cy.then(() => {
            DataImport.editMarcFile(
              editedMarcFileName,
              editedMarcFileName,
              [`a${naturalId}`],
              ['a'],
            );
          });

          cy.getToken(user.username, user.password);
          DataImport.uploadFileViaApi(
            editedMarcFileName,
            editedMarcFileName,
            jobProfile.profileName,
          );

          // Steps 10-12: Authority 010 $a is empty/absent; Number of titles maintained
          cy.visit(TopMenu.marcAuthorities);
          MarcAuthorities.waitLoading();
          MarcAuthorities.searchBeats(authorityHeading);
          MarcAuthorities.verifyNumberOfTitlesForRowWithValue(authorityHeading, '1');
          MarcAuthorities.selectTitle(authorityHeading);
          MarcAuthority.notContains(naturalId);

          // Steps 13-15: Bib 710 is still linked; $0 replaced by authority 001 HRID
          cy.visit(TopMenu.inventoryPath);
          InventoryInstances.waitContentLoading();
          InventoryInstances.searchByTitle(bibId);
          InventoryInstances.selectInstanceById(bibId);
          InventoryInstance.waitLoading();
          InventoryInstance.waitInstanceRecordViewOpened();
          InventoryInstance.editMarcBibliographicRecord();
          QuickMarcEditor.waitLoading();
          QuickMarcEditor.verifyTagFieldAfterLinkingByTag(
            marcBibFields[2].tag,
            marcBibFields[2].indicators[0],
            marcBibFields[2].indicators[1],
            `$a ${authorityHeading}`,
            '',
            `$0 ${naturalId.replace('n', '')}`,
            '',
          );
        });
      },
    );
  });
});
