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

    const authorityHeading = `AT_C376953_MarcAuthority_${randomPostfix}`;
    // no 'n' prefix — 010 starts with only $z, so $0 in bib = 001 HRID (this value)
    const naturalId = `${randomDigits}376953`;
    const zValue = `${randomDigits}0376953`;
    // invalid $a prefix (no letter prefix) — bib $0 stays as 001 HRID after add
    const invalidAValue = `${randomDigits}1376953`;
    const bibTitle = `AT_C376953_MarcBibInstance_${randomPostfix}`;

    const authorityUUIDsFileName = `AT_C376953_authorityUUIDs_${randomPostfix}.csv`;
    const defaultAuthorityExportProfile = 'Default authority';

    const mappingProfile = {
      name: `AT_C376953 Update MARC authority records by matching 999 ff $s ${randomPostfix}`,
    };
    const actionProfile = {
      name: `AT_C376953 Update MARC authority records by matching 999 ff $s ${randomPostfix}`,
      action: 'UPDATE',
      folioRecordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
    };
    const matchProfile = {
      profileName: `AT_C376953 Update MARC authority records by matching 999 ff $s ${randomPostfix}`,
      incomingRecordFields: { field: '999', in1: 'f', in2: 'f', subfield: 's' },
      existingRecordFields: { field: '999', in1: 'f', in2: 'f', subfield: 's' },
      recordType: EXISTING_RECORD_NAMES.MARC_AUTHORITY,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `AT_C376953 Update MARC authority records by matching 999 ff $s ${randomPostfix}`,
      acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC,
    };

    const marcAuthFields = [
      // 010 has only $z — no $a, so bib $0 = 001 HRID
      { tag: '010', content: `$z ${zValue}`, indicators: ['\\', '\\'] },
      { tag: '111', content: `$a ${authorityHeading}`, indicators: ['2', '\\'] },
    ];

    const marcBibFields = [
      { tag: '008', content: QuickMarcEditor.valid008ValuesInstance },
      { tag: '245', content: `$a ${bibTitle}`, indicators: ['1', '1'] },
      { tag: '711', content: '$a Field711', indicators: ['2', '\\'] },
    ];

    let user;
    let authorityId;
    let bibId;
    let exportedFileName;
    let editedMarcFileName;

    before('Create test data, job profiles, login', () => {
      cy.getAdminToken();
      MarcAuthorities.deleteMarcAuthorityByTitleViaAPI('C376953_');
      InventoryInstances.deleteInstanceByTitleViaApi('C376953_');

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

        MarcAuthorities.createMarcAuthorityViaAPI(naturalId, '', marcAuthFields).then((id) => {
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
            bibFieldTags: ['711'],
            authorityFieldTags: ['111'],
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
      'C376953 Add "$a" with invalid prefix to "010" with "$z" in linked "MARC Authority" record when "001" = "$0" (promin)',
      { tags: ['extendedPath', 'promin', 'C376953'] },
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
          editedMarcFileName = `C376953_edited_${randomPostfix}.mrc`;

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

          // Steps 5-7: Prepend invalid $a before existing $z; bib $0 stays as 001 HRID
          cy.then(() => {
            DataImport.editMarcFile(
              editedMarcFileName,
              editedMarcFileName,
              [`z${zValue}`],
              [`a${invalidAValue}z${zValue}`],
            );
          });

          cy.getToken(user.username, user.password);
          DataImport.uploadFileViaApi(
            editedMarcFileName,
            editedMarcFileName,
            jobProfile.profileName,
          );

          // Steps 10-12: Authority 010 now has both $a (invalid) and $z; Number of titles maintained
          cy.visit(TopMenu.marcAuthorities);
          MarcAuthorities.waitLoading();
          MarcAuthorities.searchBeats(authorityHeading);
          MarcAuthorities.verifyNumberOfTitlesForRowWithValue(authorityHeading, '1');
          MarcAuthorities.selectTitle(authorityHeading);
          MarcAuthority.contains(invalidAValue);
          MarcAuthority.contains(zValue);

          // Steps 13-16: Bib 711 still linked; $0 unchanged = 001 HRID (invalid $a has no letter prefix)
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
            `$0 ${naturalId}`,
            '',
          );
        });
      },
    );
  });
});
