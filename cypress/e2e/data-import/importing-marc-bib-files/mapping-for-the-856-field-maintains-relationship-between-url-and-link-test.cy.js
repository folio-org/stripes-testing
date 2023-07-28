import getRandomPostfix from '../../../support/utils/stringTools';
import permissions from '../../../support/dictionary/permissions';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import { INSTANCE_STATUS_TERM_NAMES,
  HOLDINGS_TYPE_NAMES,
  LOCATION_NAMES,
  FOLIO_RECORD_TYPE,
  ACCEPTED_DATA_TYPE_NAMES,
  JOB_STATUS_NAMES } from '../../../support/constants';
import NewInstanceStatusType from '../../../support/fragments/settings/inventory/instances/instanceStatusTypes/newInstanceStatusType';
import InstanceRecordView from '../../../support/fragments/inventory/instanceRecordView';
import Users from '../../../support/fragments/users/users';
import InstanceStatusTypes from '../../../support/fragments/settings/inventory/instances/instanceStatusTypes/instanceStatusTypes';
import InventoryInstance from '../../../support/fragments/inventory/inventoryInstance';
import InventoryViewSource from '../../../support/fragments/inventory/inventoryViewSource';

describe('ui-data-import', () => {
  let user;
  let instanceHrid;
  const testData = {
    protectedFieldId: null,
    filePath: 'marcFileForC400649.mrc',
    fileName: `C400649 autotestFile_${getRandomPostfix()}`
  };
  const firstField = {
    fieldNimberInFile: 0,
    url: 'https://muse.jhu.edu/book/67428',
    linkText: 'Project Muse'
  };
  const secondField = {
    fieldNimberInFile: 1,
    url: 'https://muse.jhu.edu/book/74528',
    linkText: 'Project Muse'
  };
  const thirdField = {
    fieldNimberInFile: 2,
    url: 'https://www.jstor.org/stable/10.2307/j.ctv26d9pv',
    linkText: 'JSTOR'
  };
  const forthField = {
    fieldNimberInFile: 3,
    url: 'https://www.jstor.org/stable/10.2307/j.ctvcwp01n',
    linkText: 'JSTOR'
  };
  const collectionOfMappingAndActionProfiles = [
    {
      mappingProfile: { typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        name: `C400649 Create ER Instance ${getRandomPostfix()}`,
        instanceStatusTerm: INSTANCE_STATUS_TERM_NAMES.ELECTRONIC_RESOURCE },
      actionProfile: { typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        name: `C400649 Create ER Instance ${getRandomPostfix()}` }
    },
    {
      mappingProfile: { typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
        name: `C400649 Create ER Holdings ${getRandomPostfix()}`,
        holdingsType: HOLDINGS_TYPE_NAMES.ELECTRONIC,
        permanentLocation: `"${LOCATION_NAMES.ANNEX}"`,
        relationship: 'Resource',
        uri: '856$u',
        linkText: '856$y',
        materialsSpecified: '856$3',
        urlPublicNote: '856$z' },
      actionProfile: { typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
        name: `C400649 Create ER Holdings ${getRandomPostfix()}` }
    }
  ];
  const jobProfile = {
    ...NewJobProfile.defaultJobProfile,
    profileName: `C400649 Create ER Instance and Holdings ${getRandomPostfix()}`,
    acceptedType: ACCEPTED_DATA_TYPE_NAMES.MARC
  };

  before('login', () => {
    cy.createTempUser([
      permissions.moduleDataImportEnabled.gui,
      permissions.settingsDataImportEnabled.gui,
      permissions.inventoryAll.gui
    ])
      .then(userProperties => {
        user = userProperties;

        NewInstanceStatusType.createViaApi()
          .then((initialInstanceStatusType) => {
            testData.instanceStatusTypeId = initialInstanceStatusType.body.id;
          });
        cy.login(user.username, user.password,
          { path: SettingsMenu.mappingProfilePath, waiter: FieldMappingProfiles.waitLoading });
      });
  });

  after('delete test data', () => {
    InstanceStatusTypes.deleteViaApi(testData.instanceStatusTypeId);
    JobProfiles.deleteJobProfile(jobProfile.profileName);
    collectionOfMappingAndActionProfiles.forEach(profile => {
      ActionProfiles.deleteActionProfile(profile.actionProfile.name);
      FieldMappingProfiles.deleteFieldMappingProfile(profile.mappingProfile.name);
    });
    Users.deleteViaApi(user.userId);
    cy.getInstance({ limit: 1, expandAll: true, query: `"hrid"=="${instanceHrid}"` })
      .then((instance) => {
        cy.deleteHoldingRecordViaApi(instance.holdings[0].id);
        InventoryInstance.deleteInstanceViaApi(instance.id);
      });
  });

  it('C400649 Verify that mapping for the 856 field maintains relationship between URL and link text (folijet)',
    { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
      // create Field mapping profiles
      cy.visit(SettingsMenu.mappingProfilePath);
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfMappingAndActionProfiles[0].mappingProfile);
      NewFieldMappingProfile.fillInstanceStatusTerm(collectionOfMappingAndActionProfiles[0].mappingProfile.instanceStatusTerm);
      FieldMappingProfiles.saveProfile();
      FieldMappingProfiles.closeViewModeForMappingProfile(collectionOfMappingAndActionProfiles[0].mappingProfile.name);

      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfMappingAndActionProfiles[1].mappingProfile);
      NewFieldMappingProfile.fillHoldingsType(collectionOfMappingAndActionProfiles[1].mappingProfile.holdingsType);
      NewFieldMappingProfile.fillPermanentLocation(collectionOfMappingAndActionProfiles[1].mappingProfile.permanentLocation);
      NewFieldMappingProfile.addElectronicAccess(
        collectionOfMappingAndActionProfiles[1].mappingProfile.relationship,
        collectionOfMappingAndActionProfiles[1].mappingProfile.uri,
        collectionOfMappingAndActionProfiles[1].mappingProfile.linkText,
        collectionOfMappingAndActionProfiles[1].mappingProfile.materialsSpecified,
        collectionOfMappingAndActionProfiles[1].mappingProfile.urlPublicNote
      );
      FieldMappingProfiles.saveProfile();
      FieldMappingProfiles.closeViewModeForMappingProfile(collectionOfMappingAndActionProfiles[1].mappingProfile.name);

      // create action profiles
      collectionOfMappingAndActionProfiles.forEach(profile => {
        cy.visit(SettingsMenu.actionProfilePath);
        ActionProfiles.create(profile.actionProfile, profile.mappingProfile.name);
        ActionProfiles.checkActionProfilePresented(profile.actionProfile.name);
      });

      // create job profile
      cy.visit(SettingsMenu.jobProfilePath);
      JobProfiles.createJobProfile(jobProfile);
      NewJobProfile.linkActionProfileByName(collectionOfMappingAndActionProfiles[0].actionProfile.name);
      NewJobProfile.linkActionProfileByName(collectionOfMappingAndActionProfiles[1].actionProfile.name);
      NewJobProfile.saveAndClose();
      JobProfiles.checkJobProfilePresented(jobProfile.profileName);

      cy.visit(TopMenu.dataImportPath);
      // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
      DataImport.verifyUploadState();
      DataImport.uploadFile(testData.filePath, testData.fileName);
      JobProfiles.searchJobProfileForImport(jobProfile.profileName);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(testData.fileName);
      Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
      Logs.openFileDetails(testData.fileName);
      [FileDetails.columnNameInResultList.srsMarc,
        FileDetails.columnNameInResultList.instance,
        FileDetails.columnNameInResultList.holdings].forEach(columnName => {
        FileDetails.checkStatusInColumn(FileDetails.status.created, columnName);
      });
      FileDetails.openInstanceInInventory('Created');
      InventoryInstance.getAssignedHRID().then(hrId => { instanceHrid = hrId; });
      [firstField, secondField, thirdField, forthField].forEach(field => {
        InstanceRecordView.verifyElectronicAccess(field.url, field.linkText, field.fieldNimberInFile);
      });
      InstanceRecordView.viewSource();
      [firstField, secondField, thirdField, forthField].forEach(field => {
        InventoryViewSource.verifyFieldInMARCBibSource('856', field.url);
        InventoryViewSource.contains(field.linkText);
      });
    });
});
