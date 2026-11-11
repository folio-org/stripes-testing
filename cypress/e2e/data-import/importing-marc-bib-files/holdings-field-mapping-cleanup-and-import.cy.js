import {
  APPLICATION_NAMES,
  EXISTING_RECORD_NAMES,
  FOLIO_RECORD_TYPE,
  JOB_STATUS_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import DataImport from '../../../support/fragments/data_import/dataImport';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import Logs from '../../../support/fragments/data_import/logs/logs';
import HoldingsRecordView from '../../../support/fragments/inventory/holdingsRecordView';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryInstances from '../../../support/fragments/inventory/inventoryInstances';
import {
  ActionProfiles as SettingsActionProfiles,
  FieldMappingProfiles as SettingsFieldMappingProfiles,
  JobProfiles as SettingsJobProfiles,
} from '../../../support/fragments/settings/dataImport';
import NewActionProfile from '../../../support/fragments/settings/dataImport/actionProfiles/newActionProfile';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import UrlRelationship from '../../../support/fragments/settings/inventory/instance-holdings-item/urlRelationship';
import InstanceStatusTypes from '../../../support/fragments/settings/inventory/instances/instanceStatusTypes/instanceStatusTypes';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import Users from '../../../support/fragments/users/users';
import FileManager from '../../../support/utils/fileManager';
import getRandomPostfix from '../../../support/utils/stringTools';
import SettingsMenu from '../../../support/fragments/settingsMenu';

describe('Data Import', () => {
  describe('Importing MARC Bib files', () => {
    const randomPostfix = getRandomPostfix();
    const instanceTitle = `AT_C17022_MarcBibInstance_${randomPostfix}`;
    const marcFileName = `AT_C17022_MarcFile_${randomPostfix}.mrc`;
    const uploadedFileName = `AT_C17022_autotestFile_${randomPostfix}.mrc`;
    const mappingProfiles = {
      instance: { name: `AT_C17022_FMP_Instance_${randomPostfix}` },
      holdings: { name: `AT_C17022_FMP_Holdings_${randomPostfix}` },
    };
    const actionProfiles = {
      instance: {
        name: `AT_C17022_AP_Instance_${randomPostfix}`,
        action: 'CREATE',
        folioRecordType: EXISTING_RECORD_NAMES.INSTANCE,
      },
      holdings: {
        name: `AT_C17022_AP_Holdings_${randomPostfix}`,
        action: 'CREATE',
        folioRecordType: EXISTING_RECORD_NAMES.HOLDINGS,
      },
    };
    const jobProfile = { name: `AT_C17022_JP_${randomPostfix}` };
    // Values that come from the MARC record
    const marcValues = {
      formerHoldingsId: `AT_C17022_FormerId_${randomPostfix}`,
      digitizationPolicy: `AT_C17022_Digitization_${randomPostfix}`,
      statement: `AT_C17022_Statement_${randomPostfix}`,
      statementPublicNote: `AT_C17022_StatementPublicNote_${randomPostfix}`,
      statementStaffNote: `AT_C17022_StatementStaffNote_${randomPostfix}`,
      supplementStatement: `AT_C17022_SupplementStatement_${randomPostfix}`,
      supplementPublicNote: `AT_C17022_SupplementPublicNote_${randomPostfix}`,
      supplementStaffNote: `AT_C17022_SupplementStaffNote_${randomPostfix}`,
      indexStatement: `AT_C17022_IndexStatement_${randomPostfix}`,
      indexPublicNote: `AT_C17022_IndexPublicNote_${randomPostfix}`,
      indexStaffNote: `AT_C17022_IndexStaffNote_${randomPostfix}`,
    };
    const electronicAccess = [
      {
        uri: `https://at-c17022-${randomPostfix}-1.example.com`,
        linkText: `AT_C17022_LinkText1_${randomPostfix}`,
        materialsSpecified: `AT_C17022_Materials1_${randomPostfix}`,
        publicNote: `AT_C17022_PublicNote1_${randomPostfix}`,
      },
      {
        uri: `https://at-c17022-${randomPostfix}-2.example.com`,
        linkText: `AT_C17022_LinkText2_${randomPostfix}`,
        materialsSpecified: `AT_C17022_Materials2_${randomPostfix}`,
        publicNote: `AT_C17022_PublicNote2_${randomPostfix}`,
      },
    ];
    // Reference data - fetched via API, the env may differ
    const referenceData = {};
    const createdIds = {};
    let instanceActionProfileId;
    let holdingsActionProfileId;
    let user;

    before('Create reference data lookups, profiles, run the import and create user', () => {
      cy.getAdminToken();
      InventoryInstances.deleteFullInstancesByTitleViaApi('C17022_');

      // Reference data - use values existing on the env
      cy.getLocations({ limit: 2, query: 'isActive=true' }).then(() => {
        const [permanentLocation, temporaryLocation] = Cypress.env('locations');
        referenceData.permanentLocation = permanentLocation;
        referenceData.temporaryLocation = temporaryLocation;
      });
      cy.getHoldingTypes({ limit: 1 }).then((holdingsTypes) => {
        referenceData.holdingsType = holdingsTypes[0];
      });
      cy.getStatisticalCodeTypes({ limit: 200 }).then((types) => {
        cy.getStatisticalCodes({ limit: 2 }).then((codes) => {
          referenceData.statisticalCodes = codes.map((code) => ({
            ...code,
            // Format of the value in the mapping profile and in the holdings view
            display: `${types.find(({ id }) => id === code.statisticalCodeTypeId).name}: ${
              code.code
            } - ${code.name}`,
          }));
        });
      });
      UrlRelationship.getViaApi({ limit: 1 }).then((relationships) => {
        referenceData.relationship = relationships[0];
      });
      InstanceStatusTypes.getViaApi({ limit: 1 }).then((statuses) => {
        referenceData.instanceStatus = statuses[0];
      });

      cy.then(() => {
        // Steps 2, 4: Instance mapping profile and action profile (API)
        NewFieldMappingProfile.createInstanceStatusTermMappingProfileViaApi({
          name: mappingProfiles.instance.name,
          statusTerm: referenceData.instanceStatus.name,
          catalogedDate: '###TODAY###',
        }).then(({ body }) => {
          NewActionProfile.createActionProfileViaApi(actionProfiles.instance, body.id).then(
            (actionProfileResponse) => {
              instanceActionProfileId = actionProfileResponse.body.id;
            },
          );
        });

        // Steps 3, 5, 6: Holdings mapping profile, action profile and the job profile (API)
        NewFieldMappingProfile.createHoldingsMappingProfileViaApi({
          name: mappingProfiles.holdings.name,
          permanentLocation: referenceData.permanentLocation.name,
          temporaryLocation: referenceData.temporaryLocation.name,
          holdingsType: referenceData.holdingsType.name,
          formerHoldingsId: '981$a',
          statisticalCodes: referenceData.statisticalCodes.map(({ display }) => display),
          holdingsStatements: [{ statement: '866$a', note: '866$z', staffNote: '866$x' }],
          holdingsStatementsForSupplements: [
            { statement: '867$a', note: '867$z', staffNote: '867$x' },
          ],
          holdingsStatementsForIndexes: [{ statement: '868$a', note: '868$z', staffNote: '868$x' }],
          digitizationPolicy: '985$a',
          electronicAccess: [
            {
              relationship: `"${referenceData.relationship.name}"`,
              uri: '856$u',
              linkText: '856$y',
              materialsSpecified: '856$3',
              urlPublicNote: '856$z',
            },
          ],
        })
          .then(({ body }) => {
            NewActionProfile.createActionProfileViaApi(actionProfiles.holdings, body.id).then(
              (actionProfileResponse) => {
                holdingsActionProfileId = actionProfileResponse.body.id;
              },
            );
          })
          .then(() => {
            NewJobProfile.createJobProfileWithLinkedTwoActionProfilesViaApi(
              jobProfile,
              instanceActionProfileId,
              holdingsActionProfileId,
            );
          });
      });

      // Step 7 (file): MARC file with the values to map; the second 856 is the second electronic access row
      DataImport.createMarcFile({
        fileName: marcFileName,
        fields: [
          { tag: '245', indicators: ['0', '0'], content: `$a ${instanceTitle}` },
          { tag: '981', indicators: ['\\', '\\'], content: `$a ${marcValues.formerHoldingsId}` },
          { tag: '985', indicators: ['\\', '\\'], content: `$a ${marcValues.digitizationPolicy}` },
          {
            tag: '866',
            indicators: ['\\', '\\'],
            content: `$a ${marcValues.statement} $z ${marcValues.statementPublicNote} $x ${marcValues.statementStaffNote}`,
          },
          {
            tag: '867',
            indicators: ['\\', '\\'],
            content: `$a ${marcValues.supplementStatement} $z ${marcValues.supplementPublicNote} $x ${marcValues.supplementStaffNote}`,
          },
          {
            tag: '868',
            indicators: ['\\', '\\'],
            content: `$a ${marcValues.indexStatement} $z ${marcValues.indexPublicNote} $x ${marcValues.indexStaffNote}`,
          },
          ...electronicAccess.map(({ uri, linkText, materialsSpecified, publicNote }) => ({
            tag: '856',
            indicators: ['4', '0'],
            content: `$u ${uri} $y ${linkText} $3 ${materialsSpecified} $z ${publicNote}`,
          })),
        ],
      });

      // Step 8 (import): run the import via API - the UI part starts from the completed job
      cy.then(() => {
        DataImport.uploadFileViaApi(marcFileName, uploadedFileName, jobProfile.name).then(
          (response) => {
            createdIds.instanceId = response[0].instance.id;
          },
        );
      });

      cy.createTempUser([
        Permissions.moduleDataImportEnabled.gui,
        Permissions.settingsDataImportEnabled.gui,
        Permissions.uiInventoryViewInstances.gui,
      ]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken(false);
      Users.deleteViaApi(user.userId);
      SettingsJobProfiles.deleteJobProfileByNameViaApi(jobProfile.name);
      Object.values(actionProfiles).forEach(({ name }) => {
        SettingsActionProfiles.deleteActionProfileByNameViaApi(name);
      });
      Object.values(mappingProfiles).forEach(({ name }) => {
        SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(name);
      });
      InventoryInstances.deleteFullInstancesByTitleViaApi(instanceTitle);
      FileManager.deleteFile(`cypress/fixtures/${marcFileName}`);
    });

    it(
      'C17022 Holdings field mapping profile cleanup and test import (promin)',
      { tags: ['extendedPath', 'promin', 'C17022'] },
      () => {
        // Steps 1, 3: Settings > Data import > Field mapping profiles - the new Holdings profile
        // form has no mappable "Shelving order" field (the profiles themselves are created via API)
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillFolioRecordType({ typeValue: FOLIO_RECORD_TYPE.HOLDINGS });
        NewFieldMappingProfile.verifyShelvingOrderFieldDisabled();
        NewFieldMappingProfile.clickClose();
        NewFieldMappingProfile.confirmCloseWithoutSaving();
        FieldMappingProfiles.waitLoading();

        // Steps 2-8: profiles are created and the file is imported via API in preconditions;
        // Data Import landing page - the import finished successfully
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.DATA_IMPORT);
        DataImport.waitLoading();
        Logs.waitFileIsImported(uploadedFileName);
        Logs.checkJobStatus(uploadedFileName, JOB_STATUS_NAMES.COMPLETED);

        // Step 9: Inventory - find the created instance, open its holdings
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.INVENTORY);
        InventoryInstances.waitContentLoading();
        InventoryInstances.searchByTitle(createdIds.instanceId);
        InventoryInstances.selectInstanceById(createdIds.instanceId);
        InventoryInstance.waitLoading();
        InventoryInstance.waitInstanceRecordViewOpened();
        InstanceRecordView.openHoldingView(false);

        // Step 9: Holdings view - all mapped values are shown
        HoldingsRecordView.checkPermanentLocation(referenceData.permanentLocation.name);
        HoldingsRecordView.checkTemporaryLocation(referenceData.temporaryLocation.name);
        HoldingsRecordView.checkFormerHoldingsId(marcValues.formerHoldingsId);
        HoldingsRecordView.checkHoldingsType(referenceData.holdingsType.name);
        HoldingsRecordView.checkDigitizationPolicy(marcValues.digitizationPolicy);
        referenceData.statisticalCodes.forEach(({ name }) => {
          HoldingsRecordView.checkStatisticalCode(name);
        });
        [
          marcValues.statement,
          marcValues.statementPublicNote,
          marcValues.statementStaffNote,
        ].forEach((value) => HoldingsRecordView.checkHoldingsStatement(value));
        [
          marcValues.supplementStatement,
          marcValues.supplementPublicNote,
          marcValues.supplementStaffNote,
        ].forEach((value) => HoldingsRecordView.checkHoldingsStatementForSupplements(value));
        [marcValues.indexStatement, marcValues.indexPublicNote, marcValues.indexStaffNote].forEach(
          (value) => HoldingsRecordView.checkHoldingsStatementForIndexes(value),
        );
        electronicAccess.forEach(({ uri, linkText, materialsSpecified, publicNote }, index) => {
          HoldingsRecordView.checkElectronicAccess(
            referenceData.relationship.name,
            uri,
            linkText,
            materialsSpecified,
            publicNote,
            index,
          );
        });
      },
    );
  });
});
