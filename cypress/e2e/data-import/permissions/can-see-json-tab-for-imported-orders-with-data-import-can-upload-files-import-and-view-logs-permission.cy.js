import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import {
  FOLIO_RECORD_TYPE,
  ORDER_STATUSES,
  MATERIAL_TYPE_NAMES,
  ORDER_FORMAT_NAMES_IN_PROFILE,
  ACQUISITION_METHOD_NAMES,
  JOB_STATUS_NAMES,
  VENDOR_NAMES,
} from '../../../support/constants';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import TopMenu from '../../../support/fragments/topMenu';
import DataImport from '../../../support/fragments/data_import/dataImport';
import Logs from '../../../support/fragments/data_import/logs/logs';
import FileDetails from '../../../support/fragments/data_import/logs/fileDetails';
import OrderLines from '../../../support/fragments/orders/orderLines';
import Users from '../../../support/fragments/users/users';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';
import JsonScreenView from '../../../support/fragments/data_import/logs/jsonScreenView';

describe('data-import', () => {
  describe('Permissions', () => {
    let user;
    const filePath = 'marcBibFileForC377023.mrc';
    const marcFileName = `C377023 autotestFileName ${getRandomPostfix()}`;
    const title = 'ROALD DAHL : TELLER OF THE UNEXPECTED : A BIOGRAPHY.';

    const mappingProfile = {
      name: `C377023 Test Order ${getRandomPostfix()}`,
      typeValue: FOLIO_RECORD_TYPE.ORDER,
      orderStatus: ORDER_STATUSES.PENDING,
      approved: true,
      vendor: VENDOR_NAMES.GOBI,
      reEncumber: 'false',
      title: '245$a',
      mustAcknowledgeReceivingNote: 'false',
      publicationDate: '264$c; else 260$c',
      publisher: '264$b; else 260$b',
      edition: '250$a',
      internalNote: '981$d',
      acquisitionMethod: ACQUISITION_METHOD_NAMES.PURCHASE_AT_VENDOR_SYSTEM,
      orderFormat: ORDER_FORMAT_NAMES_IN_PROFILE.PHYSICAL_RESOURCE,
      receiptStatus: 'Pending',
      paymentStatus: 'Pending',
      selector: '981$e',
      cancellationRestriction: 'false',
      rush: '981$h',
      receivingWorkflow: 'Synchronized',
      accountNumber: '981$g',
      physicalUnitPrice: '980$b',
      quantityPhysical: '980$g',
      currency: 'USD',
      materialSupplier: VENDOR_NAMES.GOBI,
      createInventory: 'Instance, Holding, Item',
      materialType: MATERIAL_TYPE_NAMES.BOOK,
      contributor: '100$a',
      contributorType: 'Personal name',
      productId: '020$a',
      qualifier: '020$q',
      productIDType: 'ISBN',
      vendorReferenceNumber: '980$f',
      vendorReferenceType: 'Vendor order reference number',
      fundId: '981$b',
      expenseClass: '981$c',
      value: '100',
      type: '%',
      locationName: '049$a',
      locationQuantityPhysical: '980$g',
      volume: '993$a',
    };
    const actionProfile = {
      typeValue: FOLIO_RECORD_TYPE.ORDER,
      name: `C377023 Test Order ${getRandomPostfix()}`,
    };
    const jobProfile = {
      ...NewJobProfile.defaultJobProfile,
      profileName: `C377023 Test Order ${getRandomPostfix()}`,
    };

    before('create test data', () => {
      cy.loginAsAdmin({
        path: SettingsMenu.mappingProfilePath,
        waiter: FieldMappingProfiles.waitLoading,
      });
      // create mapping profile
      FieldMappingProfiles.createOrderMappingProfile(mappingProfile);
      FieldMappingProfiles.checkMappingProfilePresented(mappingProfile.name);

      // create action profile
      cy.visit(SettingsMenu.actionProfilePath);
      ActionProfiles.create(actionProfile, mappingProfile.name);
      ActionProfiles.checkActionProfilePresented(actionProfile.name);

      // create job profile
      cy.visit(SettingsMenu.jobProfilePath);
      JobProfiles.createJobProfile(jobProfile);
      NewJobProfile.linkActionProfile(actionProfile);
      NewJobProfile.saveAndClose();
      JobProfiles.checkJobProfilePresented(jobProfile.profileName);

      cy.visit(TopMenu.dataImportPath);
      // TODO delete function after fix https://issues.folio.org/browse/MODDATAIMP-691
      DataImport.verifyUploadState();
      DataImport.uploadFile(filePath, marcFileName);
      JobProfiles.search(jobProfile.profileName);
      JobProfiles.runImportFile();
      JobProfiles.waitFileIsImported(marcFileName);
      Logs.checkStatusOfJobProfile(JOB_STATUS_NAMES.COMPLETED);
      cy.logout();

      cy.createTempUser([Permissions.moduleDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;
        cy.login(user.username, user.password, {
          path: TopMenu.dataImportPath,
          waiter: DataImport.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      JobProfiles.deleteJobProfile(jobProfile.profileName);
      ActionProfiles.deleteActionProfile(actionProfile.name);
      FieldMappingProfileView.deleteViaApi(mappingProfile.name);
    });

    it(
      'C377023 A user can see JSON tab for imported Orders with "Data import: Can upload files, import, and view logs" permission (folijet)',
      { tags: [TestTypes.extendedPath, DevTeams.folijet] },
      () => {
        const message = `Import Log for Record 1 (${title})`;

        Logs.openFileDetails(marcFileName);
        FileDetails.openJsonScreen(title);
        JsonScreenView.verifyJsonScreenIsOpened();
        JsonScreenView.openOrderTab();
        JsonScreenView.verifyContentInTab(message);
        cy.go('back');
        FileDetails.openOrder('Created');
        OrderLines.waitLoading();
        OrderLines.verifyOrderTitle(title);
      },
    );
  });
});
