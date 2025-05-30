import {
  FOLIO_RECORD_TYPE,
  ITEM_STATUS_NAMES,
  LOAN_TYPE_NAMES,
  LOCATION_NAMES,
  MATERIAL_TYPE_NAMES,
} from '../../../support/constants';
import { Permissions } from '../../../support/dictionary';
import FieldMappingProfileView from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfileView';
import FieldMappingProfiles from '../../../support/fragments/settings/dataImport/fieldMappingProfile/fieldMappingProfiles';
import NewFieldMappingProfile from '../../../support/fragments/settings/dataImport/fieldMappingProfile/newFieldMappingProfile';
import { FieldMappingProfiles as SettingsFieldMappingProfiles } from '../../../support/fragments/settings/dataImport';
import SettingsMenu from '../../../support/fragments/settingsMenu';
import Users from '../../../support/fragments/users/users';
import getRandomPostfix from '../../../support/utils/stringTools';

describe('Data Import', () => {
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

    before('Create test user and login', () => {
      cy.createTempUser([Permissions.settingsDataImportEnabled.gui]).then((userProperties) => {
        user = userProperties;

        cy.login(user.username, user.password, {
          path: SettingsMenu.mappingProfilePath,
          waiter: FieldMappingProfiles.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken().then(() => {
        collectionOfMappingProfiles.forEach((profile) => {
          SettingsFieldMappingProfiles.deleteMappingProfileByNameViaApi(profile.name);
        });
        Users.deleteViaApi(user.userId);
      });
    });

    it(
      'C356832 Inventory Admin note field should validate for MARC, text, or cascade in the field mapping profile (folijet)',
      { tags: ['extendedPath', 'folijet', 'C356832'] },
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
      },
    );
  });
});
