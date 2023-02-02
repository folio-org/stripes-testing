import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import permissions from '../../../support/dictionary/permissions';
import Helper from '../../../support/fragments/finance/financeHelper';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import ActionProfiles from '../../../support/fragments/data_import/action_profiles/actionProfiles';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';
import Users from '../../../support/fragments/users/users';
import ActionProfileEdit from '../../../support/fragments/data_import/action_profiles/actionProfileEdit';
import ActionProfileView from '../../../support/fragments/data_import/action_profiles/actionProfileView';
import JobProfiles from '../../../support/fragments/data_import/job_profiles/jobProfiles';
import NewJobProfile from '../../../support/fragments/data_import/job_profiles/newJobProfile';
import ConfirmChanges from '../../../support/fragments/data_import/action_profiles/modals/confirmChanges';

describe('ui-data-import: Item update via match by status', () => {
  let user;

  // unique profile names
  const jobProfileName = `C350590 autotestJobProf${Helper.getRandomBarcode()}`;
  const matchProfileNameForInstance = `C350590 935 $a POL to Instance POL ${Helper.getRandomBarcode()}`;
  const matchProfileNameForHoldings = `C350590 935 $a POL to Holdings POL ${Helper.getRandomBarcode()}`;
  const matchProfileNameForItem = `C350590 935 $a POL to Item POL ${Helper.getRandomBarcode()}`;
  const actionProfileNameForInstance = `C350590 Update Instance by POL match ${Helper.getRandomBarcode()}`;
  const actionProfileNameForHoldings = `C350590 Update Holdings by POL match ${Helper.getRandomBarcode()}`;
  const actionProfileNameForItem = `C350590 Update Item by POL match ${Helper.getRandomBarcode()}`;


  const mappingProfileNameForHoldings = `C357552 Create simple holdings ${Helper.getRandomBarcode()}`;
  const mappingProfileNameForCreateItem = `C357552 Create simple items ${Helper.getRandomBarcode()}`;
  const mappingProfileNameForUpdateItem = `C357552 Update Item by POL match ${Helper.getRandomBarcode()}`;

  const collectionOfMappingAndActionProfiles = [
    {
      mappingProfile: { typeValue: NewFieldMappingProfile.folioRecordTypeValue.holdings,
        name: mappingProfileNameForHoldings },
    //   actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.instance,
    //     name: createInstanceActionProfileName,
    //     action: 'Create (all record types except MARC Authority or MARC Holdings)' }
    },
    {
      mappingProfile: { typeValue: NewFieldMappingProfile.folioRecordTypeValue.item,
        name: mappingProfileNameForCreateItem },
    //   actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.holdings,
    //     name: createEHoldingsActionProfileName,
    //     action: 'Create (all record types except MARC Authority or MARC Holdings)' }
    },
    {
      mappingProfile: { typeValue: NewFieldMappingProfile.folioRecordTypeValue.item,
        name: mappingProfileNameForUpdateItem },
    //   actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.holdings,
    //     name: updateEHoldingsActionProfileName,
    //     action: 'Update (all record types except Orders, Invoices, or MARC Holdings)' }
    }
  ];

  before('create user', () => {
    cy.createTempUser([
      permissions.moduleDataImportEnabled.gui,
      permissions.settingsDataImportEnabled.gui,
      // Settings (data-export): display list of settings pages
      permissions.inventoryAll.gui,
      // Inventory: Mark items in process (non-requestable)
      // Inventory: Mark items intellectual item
      // Inventory: Mark items long missing
      // Inventory: Mark items restricted
      // Inventory: Mark items unavailable
      // Inventory: Mark items unknown
      permissions.uiInventoryMarkItemsWithdrawn.gui,
      // UI: Data export module is enabled

      permissions.settingsDataImportEnabled.gui
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password, { path: SettingsMenu.mappingProfilePath, waiter: FieldMappingProfiles.waitLoading });
      });
  });

  const createInstanceMappingProfile = (instanceMappingProfile) => {
    FieldMappingProfiles.openNewMappingProfileForm();
    NewFieldMappingProfile.fillSummaryInMappingProfile(instanceMappingProfile);
    NewFieldMappingProfile.fillCatalogedDate('###TODAY###');
    FieldMappingProfiles.saveProfile();
    FieldMappingProfiles.closeViewModeForMappingProfile(instanceMappingProfile.name);
  };

  //   const createHoldingsMappingProfile = (holdingsMappingProfile) => {
  //     FieldMappingProfiles.openNewMappingProfileForm();
  //     NewFieldMappingProfile.fillSummaryInMappingProfile(holdingsMappingProfile);
  //     NewFieldMappingProfile.fillPermanentLocation('"Online (E)"');
  //     NewFieldMappingProfile.addElectronicAccess('"Resource"', '856$u', '856$z');
  //     FieldMappingProfiles.saveProfile();
  //     FieldMappingProfiles.closeViewModeForMappingProfile(holdingsMappingProfile.name);
  //   };

  //   const updateHoldingsMappingProfile = (holdingsMappingProfile) => {
  //     FieldMappingProfiles.openNewMappingProfileForm();
  //     NewFieldMappingProfile.fillSummaryInMappingProfile(holdingsMappingProfile);
  //     NewFieldMappingProfile.addSuppressFromDiscovery();
  //     NewFieldMappingProfile.fillCallNumberType('"Other scheme"');
  //     NewFieldMappingProfile.fillCallNumber('"ONLINE"');
  //     FieldMappingProfiles.saveProfile();
  //     FieldMappingProfiles.closeViewModeForMappingProfile(holdingsMappingProfile.name);
  //   };

  it('C357552 Check item update via match by status (folijet)',
    { tags: [TestTypes.smoke, DevTeams.folijet] }, () => {
      createInstanceMappingProfile(collectionOfMappingAndActionProfiles[0].mappingProfile);
      FieldMappingProfiles.checkMappingProfilePresented(collectionOfMappingAndActionProfiles[0].mappingProfile.name);
      createHoldingsMappingProfile(collectionOfMappingAndActionProfiles[1].mappingProfile);
      FieldMappingProfiles.checkMappingProfilePresented(collectionOfMappingAndActionProfiles[1].mappingProfile.name);
      updateHoldingsMappingProfile(collectionOfMappingAndActionProfiles[2].mappingProfile);
      FieldMappingProfiles.checkMappingProfilePresented(collectionOfMappingAndActionProfiles[2].mappingProfile.name);

      
    });
});
