import permissions from '../../../support/dictionary/permissions';
import TestTypes from '../../../support/dictionary/testTypes';
import DevTeams from '../../../support/dictionary/devTeams';
import Helper from '../../../support/fragments/finance/financeHelper';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewActionProfile from '../../../support/fragments/data_import/action_profiles/newActionProfile';

describe('ui-data-import', () => {
  let user;
  // unique profile names
  const jobProfileName = ` ${Helper.getRandomBarcode()}`;
  const matchProfileName = ` ${Helper.getRandomBarcode()}`;
  const actionProfileNameForInstance = ` ${Helper.getRandomBarcode()}`;
  const actionProfileNameForHoldings = ` ${Helper.getRandomBarcode()}`;
  const actionProfileNameForItem = ` ${Helper.getRandomBarcode()}`;
  const mappingProfileNameForInstance = ` ${Helper.getRandomBarcode()}`;
  const mappingProfileNameForHoldings = ` ${Helper.getRandomBarcode()}`;
  const mappingProfileNameForItem = `C368005 Create item for mapping notes ${Helper.getRandomBarcode()}`;

  const collectionOfProfiles = [
    {
      mappingProfile: { typeValue: NewFieldMappingProfile.folioRecordTypeValue.instance,
        name: mappingProfileNameForInstance,
        catalogingDate: '###TODAY###' },
      actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.instance,
        name: actionProfileNameForInstance }
    },
    {
      mappingProfile: { typeValue: NewFieldMappingProfile.folioRecordTypeValue.holdings,
        name: mappingProfileNameForHoldings,
        permanetLocation: '' },
      actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.holdings,
        name: actionProfileNameForHoldings }
    },
    {
      mappingProfile: { typeValue: NewFieldMappingProfile.folioRecordTypeValue.item,
        name: mappingProfileNameForItem,
        materialType: '"book"',
        itemNotes:'',
        noteType: '876$t',
        note: '876$n',
        staffOnly: 'Mark for all affected records',
        permanentLoanType: 'Can circulate',
        status: 'Available' },
      actionProfile: { typeValue: NewActionProfile.folioRecordTypeValue.item,
        name: actionProfileNameForItem }
    }
  ];

  before('create test data', () => {
    cy.createTempUser([
      permissions.moduleDataImportEnabled.gui,
      permissions.inventoryAll.gui,
      permissions.settingsDataImportEnabled.gui,
      permissions.uiQuickMarcQuickMarcBibliographicEditorView.gui
    ])
      .then(userProperties => {
        user = userProperties;
        cy.login(user.username, user.password);
      });
  });



  it('C368005 Verify the mapping for item record notes and check in/out notes from MARC field (folijet)',
    { tags: [TestTypes.criticalPath, DevTeams.folijet] }, () => {
      FieldMappingProfiles.openNewMappingProfileForm();
      NewFieldMappingProfile.fillSummaryInMappingProfile(itemMappingProfile);
      NewFieldMappingProfile.fillBarcode('981$b');
      NewFieldMappingProfile.fillCopyNumber('981$a');
      NewFieldMappingProfile.fillStatus('"Available"');
      NewFieldMappingProfile.fillPermanentLoanType('"Can circulate"');
      NewFieldMappingProfile.fillMaterialType('"book"');
      FieldMappingProfiles.saveProfile();
      FieldMappingProfiles.closeViewModeForMappingProfile(itemMappingProfile.name);
    });
});
