import getRandomPostfix from '../../../support/utils/stringTools';
import { DevTeams, TestTypes, Permissions } from '../../../support/dictionary';
import {
  FOLIO_RECORD_TYPE,
  LOCATION_NAMES,
  ITEM_STATUS_NAMES,
  LOAN_TYPE_NAMES,
  MATERIAL_TYPE_NAMES,
} from '../../../support/constants';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import FieldMappingProfiles from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/data_import/mapping_profiles/newFieldMappingProfile';
import Users from '../../../support/fragments/users/users';
import FieldMappingProfileView from '../../../support/fragments/data_import/mapping_profiles/fieldMappingProfileView';

describe('data-import', () => {
  describe('Settings', () => {
    let user;
    const collectionOfMappingProfiles = [
      {
        name: `C356832 Instance - Admin note validation${getRandomPostfix()}`,
        typeValue: FOLIO_RECORD_TYPE.INSTANCE,
        adminNotes: ['901$$a', 'Did this note get added?', '901$a; else Did this note get added?'],
        adminNotesForChanging: [
          '901$a',
          '"Did this note get added?"',
          '901$a; else "Did this note get added?"',
        ],
      },
      {
        name: `C356832 Holdings - Admin note validation${getRandomPostfix()}`,
        typeValue: FOLIO_RECORD_TYPE.HOLDINGS,
        permanentLocation: `"${LOCATION_NAMES.ONLINE}"`,
        adminNotes1: '901$$a',
        adminNotes: ['901$$a', 'Did this note get added?', '901$a; else Did this note get added?'],
        adminNotesForChanging: [
          '901$a',
          '"Did this note get added?"',
          '901$a; else "Did this note get added?"',
        ],
      },
      {
        name: `C356832 Item - Admin note validation${getRandomPostfix()}`,
        typeValue: FOLIO_RECORD_TYPE.ITEM,
        status: ITEM_STATUS_NAMES.AVAILABLE,
        permanentLoanType: LOAN_TYPE_NAMES.CAN_CIRCULATE,
        materialType: `"${MATERIAL_TYPE_NAMES.BOOK}"`,
        adminNotes: ['901$$a', 'Did this note get added?', '901$a; else Did this note get added?'],
        adminNotesForChanging: [
          '901$a',
          '"Did this note get added?"',
          '901$a; else "Did this note get added?"',
        ],
      },
    ];

    before('create test user', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken().then(() => {
        collectionOfMappingProfiles.forEach((profile) => {
          FieldMappingProfileView.deleteViaApi(profile.name);
        });
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C356832 Inventory Admin note field should validate for MARC, text, or cascade in the field mapping profile (folijet)',
      { tags: [TestTypes.criticalPath, DevTeams.folijet] },
      () => {
        // create mapping profile for instance
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfMappingProfiles[0]);
        NewFieldMappingProfile.addAdminNoteAndValidateCorrectValue(
          collectionOfMappingProfiles[0].adminNotes,
          9,
        );
        NewFieldMappingProfile.changedExistingAdminNote(
          collectionOfMappingProfiles[0].adminNotesForChanging,
          9,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.checkCalloutMessage(
          `The field mapping profile "${collectionOfMappingProfiles[0].name}" was successfully created`,
        );
        FieldMappingProfileView.closeViewMode(collectionOfMappingProfiles[0].name);
        FieldMappingProfiles.checkMappingProfilePresented(collectionOfMappingProfiles[0].name);
        FieldMappingProfileView.closeViewMode(collectionOfMappingProfiles[0].name);

        // create mapping profile for holdings
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfMappingProfiles[1]);
        NewFieldMappingProfile.addAdminNoteAndValidateCorrectValue(
          collectionOfMappingProfiles[1].adminNotes,
          5,
        );
        NewFieldMappingProfile.changedExistingAdminNote(
          collectionOfMappingProfiles[1].adminNotesForChanging,
          5,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.checkCalloutMessage(
          `The field mapping profile "${collectionOfMappingProfiles[1].name}" was successfully created`,
        );
        FieldMappingProfileView.closeViewMode(collectionOfMappingProfiles[1].name);
        FieldMappingProfiles.checkMappingProfilePresented(collectionOfMappingProfiles[1].name);
        FieldMappingProfileView.closeViewMode(collectionOfMappingProfiles[1].name);

        // create mapping profile for item
        FieldMappingProfiles.openNewMappingProfileForm();
        NewFieldMappingProfile.fillSummaryInMappingProfile(collectionOfMappingProfiles[2]);
        NewFieldMappingProfile.addAdminNoteAndValidateCorrectValue(
          collectionOfMappingProfiles[2].adminNotes,
          7,
        );
        NewFieldMappingProfile.changedExistingAdminNote(
          collectionOfMappingProfiles[2].adminNotesForChanging,
          7,
        );
        NewFieldMappingProfile.save();
        FieldMappingProfileView.checkCalloutMessage(
          `The field mapping profile "${collectionOfMappingProfiles[2].name}" was successfully created`,
        );
        FieldMappingProfileView.closeViewMode(collectionOfMappingProfiles[2].name);
        FieldMappingProfiles.checkMappingProfilePresented(collectionOfMappingProfiles[2].name);
        FieldMappingProfileView.closeViewMode(collectionOfMappingProfiles[2].name);
      },
    );
  });
});
