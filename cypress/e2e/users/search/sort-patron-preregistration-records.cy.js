import Permissions from '../../../support/dictionary/permissions';
import TopMenu from '../../../support/fragments/topMenu';
import PatronPreRegistrationRecords from '../../../support/fragments/users/patronPreRegistrationRecords';
import Users from '../../../support/fragments/users/users';
import UsersSearchPane from '../../../support/fragments/users/usersSearchPane';
import getRandomPostfix from '../../../support/utils/stringTools';
import { buildPreRegistrationRecord } from '../../../support/utils/users';
import { SORT_DIRECTIONS } from '../../../support/constants';

describe('Users', () => {
  describe('Patron preregistration records', () => {
    const baseRecordName = `AT_C584494_PreRegistration_${getRandomPostfix()}`;
    const searchQuery = baseRecordName.toLowerCase();
    const labelsInCreationOrder = ['Beta', 'Charlie', 'Alpha'];
    const emailVerificationColumn = 'Email verification';
    const allEmailCommunicationPreferences = ['Programs', 'Services', 'Support'];

    const testData = {
      user: {},
      preRegistrationRecords: [],
    };

    const visibleColumns = [
      'Action',
      'First name',
      'Last name',
      'Middle name',
      'Preferred first name',
      'Email',
      'Phone number',
      'Mobile number',
      'Address',
      'Email communication preferences',
      'Submission date',
      emailVerificationColumn,
      'Minor',
    ];

    const preRegistrationTemplates = [
      {
        label: labelsInCreationOrder[0],
        phone: '555-0200',
        mobilePhone: '444-0200',
        preferredEmailCommunication: ['Programs'],
        isEmailVerified: false,
      },
      {
        label: labelsInCreationOrder[1],
        phone: '555-0300',
        mobilePhone: '444-0300',
        preferredEmailCommunication: allEmailCommunicationPreferences,
        isEmailVerified: true,
      },
      {
        label: labelsInCreationOrder[2],
        phone: '555-0100',
        mobilePhone: '444-0100',
        preferredEmailCommunication: ['Services'],
        isEmailVerified: false,
      },
    ];
    const buildExpectedDisplayedRow = ({
      label,
      phone,
      mobilePhone,
      preferredEmailCommunication,
    }) => ({
      values: {
        'First name': `${baseRecordName}_${label}_First`,
        'Last name': `${baseRecordName}_${label}_Last`,
        'Middle name': `${baseRecordName}_${label}_Middle`,
        'Preferred first name': `${baseRecordName}_${label}_Preferred`,
        Email: `${searchQuery}.${label.toLowerCase()}@example.com`,
        'Phone number': phone,
        'Mobile number': mobilePhone,
        Address: `${baseRecordName} ${label} Street,Suite 100,Metropolis,NY,12345,USA`,
        'Email communication preferences': preferredEmailCommunication.join(','),
      },
    });
    const expectedDisplayedRows = preRegistrationTemplates.map(buildExpectedDisplayedRow);

    before('Create test data', () => {
      cy.getAdminToken();

      cy.wrap(preRegistrationTemplates)
        .each((template) => {
          cy.createStagingUserApi(
            buildPreRegistrationRecord(baseRecordName, searchQuery, template),
          );
        })
        .then(() => {
          cy.createTempUser([
            Permissions.uiUsersPatronPreRegistrationsView.gui,
            Permissions.uiUsersPatronPreRegistrationsMerge.gui,
          ]).then((userProperties) => {
            testData.user = userProperties;

            cy.login(testData.user.username, testData.user.password, {
              path: TopMenu.usersPath,
              waiter: UsersSearchPane.waitLoading,
            });
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(testData.user.userId);
    });

    it(
      'C584494 - Sort patron preregistration records in "Users" app',
      { tags: ['extendedPath', 'volaris', 'C584494'] },
      () => {
        // Step 1: Click on "Actions" button -> select "Search patron preregistration records" option
        UsersSearchPane.openPatronPreRegistrationRecords();
        PatronPreRegistrationRecords.verifyResultsPaneOpened();
        PatronPreRegistrationRecords.verifyEnterSearchQueryMessageVisible();

        // Step 2: Perform search to retrieve at least 2 preregistration records
        PatronPreRegistrationRecords.searchByQuery(searchQuery);
        PatronPreRegistrationRecords.verifyEnterSearchQueryMessageHidden();
        PatronPreRegistrationRecords.verifyResultsCount(3);
        PatronPreRegistrationRecords.verifyColumns(visibleColumns);
        PatronPreRegistrationRecords.verifyActionColumnContainsNewButtonInEachRow();
        PatronPreRegistrationRecords.verifyColumnIsSortable('First name');
        PatronPreRegistrationRecords.verifyColumnIsSortable('Last name');
        PatronPreRegistrationRecords.verifyColumnIsSortable('Middle name');
        PatronPreRegistrationRecords.verifyColumnIsSortable('Preferred first name');
        PatronPreRegistrationRecords.verifyColumnIsSortable('Email');
        PatronPreRegistrationRecords.verifyColumnIsSortable('Phone number');
        PatronPreRegistrationRecords.verifyColumnIsSortable('Mobile number');
        PatronPreRegistrationRecords.verifyColumnIsSortable('Address');
        PatronPreRegistrationRecords.verifyColumnIsSortable('Email communication preferences');
        PatronPreRegistrationRecords.verifyColumnIsSortable('Submission date');
        PatronPreRegistrationRecords.verifyColumnIsSortable(emailVerificationColumn);
        PatronPreRegistrationRecords.verifyRowsDisplayValues(expectedDisplayedRows);
        PatronPreRegistrationRecords.verifyColumnValuesNotSorted('First name');

        // Step 3: Click on "First name" column name once
        PatronPreRegistrationRecords.clickColumnHeader('First name');
        PatronPreRegistrationRecords.verifyColumnSortDirection(
          'First name',
          SORT_DIRECTIONS.ASCENDING,
        );
        PatronPreRegistrationRecords.verifyColumnValuesSorted(
          'First name',
          SORT_DIRECTIONS.ASCENDING,
        );

        // Step 4: Click on "First name" column name once again
        PatronPreRegistrationRecords.clickColumnHeader('First name');
        PatronPreRegistrationRecords.verifyColumnSortDirection(
          'First name',
          SORT_DIRECTIONS.DESCENDING,
        );
        PatronPreRegistrationRecords.verifyColumnValuesSorted(
          'First name',
          SORT_DIRECTIONS.DESCENDING,
        );

        // Step 5: Click on "Last name" column name once
        PatronPreRegistrationRecords.clickColumnHeader('Last name');
        PatronPreRegistrationRecords.verifyColumnSortDirection(
          'Last name',
          SORT_DIRECTIONS.ASCENDING,
        );
        PatronPreRegistrationRecords.verifyColumnValuesSorted(
          'Last name',
          SORT_DIRECTIONS.ASCENDING,
        );

        // Step 6: Click on "Last name" column name once again
        PatronPreRegistrationRecords.clickColumnHeader('Last name');
        PatronPreRegistrationRecords.verifyColumnSortDirection(
          'Last name',
          SORT_DIRECTIONS.DESCENDING,
        );
        PatronPreRegistrationRecords.verifyColumnValuesSorted(
          'Last name',
          SORT_DIRECTIONS.DESCENDING,
        );

        // Step 7: Click on "Middle name" column name once
        PatronPreRegistrationRecords.clickColumnHeader('Middle name');
        PatronPreRegistrationRecords.verifyColumnSortDirection(
          'Middle name',
          SORT_DIRECTIONS.ASCENDING,
        );
        PatronPreRegistrationRecords.verifyColumnValuesSorted(
          'Middle name',
          SORT_DIRECTIONS.ASCENDING,
        );

        // Step 8: Click on "Middle name" column name once again
        PatronPreRegistrationRecords.clickColumnHeader('Middle name');
        PatronPreRegistrationRecords.verifyColumnSortDirection(
          'Middle name',
          SORT_DIRECTIONS.DESCENDING,
        );
        PatronPreRegistrationRecords.verifyColumnValuesSorted(
          'Middle name',
          SORT_DIRECTIONS.DESCENDING,
        );

        // Step 9: Click on "Preferred first name" column name once
        PatronPreRegistrationRecords.clickColumnHeader('Preferred first name');
        PatronPreRegistrationRecords.verifyColumnSortDirection(
          'Preferred first name',
          SORT_DIRECTIONS.ASCENDING,
        );
        PatronPreRegistrationRecords.verifyColumnValuesSorted(
          'Preferred first name',
          SORT_DIRECTIONS.ASCENDING,
        );

        // Step 10: Click on "Preferred first name" column name once again
        PatronPreRegistrationRecords.clickColumnHeader('Preferred first name');
        PatronPreRegistrationRecords.verifyColumnSortDirection(
          'Preferred first name',
          SORT_DIRECTIONS.DESCENDING,
        );
        PatronPreRegistrationRecords.verifyColumnValuesSorted(
          'Preferred first name',
          SORT_DIRECTIONS.DESCENDING,
        );

        // Step 11: Click on "Email" column name once
        PatronPreRegistrationRecords.clickColumnHeader('Email');
        PatronPreRegistrationRecords.verifyColumnSortDirection('Email', SORT_DIRECTIONS.ASCENDING);
        PatronPreRegistrationRecords.verifyColumnValuesSorted('Email', SORT_DIRECTIONS.ASCENDING);

        // Step 12: Click on "Email" column name once again
        PatronPreRegistrationRecords.clickColumnHeader('Email');
        PatronPreRegistrationRecords.verifyColumnSortDirection('Email', SORT_DIRECTIONS.DESCENDING);
        PatronPreRegistrationRecords.verifyColumnValuesSorted('Email', SORT_DIRECTIONS.DESCENDING);

        // Step 13: Click on "Phone number" column name once
        PatronPreRegistrationRecords.clickColumnHeader('Phone number');
        PatronPreRegistrationRecords.verifyColumnSortDirection(
          'Phone number',
          SORT_DIRECTIONS.ASCENDING,
        );
        PatronPreRegistrationRecords.verifyColumnValuesSorted(
          'Phone number',
          SORT_DIRECTIONS.ASCENDING,
        );

        // Step 14: Click on "Phone number" column name once again
        PatronPreRegistrationRecords.clickColumnHeader('Phone number');
        PatronPreRegistrationRecords.verifyColumnSortDirection(
          'Phone number',
          SORT_DIRECTIONS.DESCENDING,
        );
        PatronPreRegistrationRecords.verifyColumnValuesSorted(
          'Phone number',
          SORT_DIRECTIONS.DESCENDING,
        );

        // Step 15: Click on "Mobile number" column name once
        PatronPreRegistrationRecords.clickColumnHeader('Mobile number');
        PatronPreRegistrationRecords.verifyColumnSortDirection(
          'Mobile number',
          SORT_DIRECTIONS.ASCENDING,
        );
        PatronPreRegistrationRecords.verifyColumnValuesSorted(
          'Mobile number',
          SORT_DIRECTIONS.ASCENDING,
        );

        // Step 16: Click on "Mobile number" column name once again
        PatronPreRegistrationRecords.clickColumnHeader('Mobile number');
        PatronPreRegistrationRecords.verifyColumnSortDirection(
          'Mobile number',
          SORT_DIRECTIONS.DESCENDING,
        );
        PatronPreRegistrationRecords.verifyColumnValuesSorted(
          'Mobile number',
          SORT_DIRECTIONS.DESCENDING,
        );

        // Step 17: Click on "Address" column name once
        PatronPreRegistrationRecords.clickColumnHeader('Address');
        PatronPreRegistrationRecords.verifyColumnSortDirection(
          'Address',
          SORT_DIRECTIONS.ASCENDING,
        );
        PatronPreRegistrationRecords.verifyColumnValuesSorted('Address', SORT_DIRECTIONS.ASCENDING);

        // Step 18: Click on "Address" column name once again
        PatronPreRegistrationRecords.clickColumnHeader('Address');
        PatronPreRegistrationRecords.verifyColumnSortDirection(
          'Address',
          SORT_DIRECTIONS.DESCENDING,
        );
        PatronPreRegistrationRecords.verifyColumnValuesSorted(
          'Address',
          SORT_DIRECTIONS.DESCENDING,
        );

        // Step 19: Click on "Email communication preferences" column name once
        PatronPreRegistrationRecords.clickColumnHeader('Email communication preferences');
        PatronPreRegistrationRecords.verifyColumnSortDirection(
          'Email communication preferences',
          SORT_DIRECTIONS.ASCENDING,
        );
        PatronPreRegistrationRecords.verifyColumnValuesSorted(
          'Email communication preferences',
          SORT_DIRECTIONS.ASCENDING,
        );

        // Step 20: Click on "Email communication preferences" column name once again
        PatronPreRegistrationRecords.clickColumnHeader('Email communication preferences');
        PatronPreRegistrationRecords.verifyColumnSortDirection(
          'Email communication preferences',
          SORT_DIRECTIONS.DESCENDING,
        );
        PatronPreRegistrationRecords.verifyColumnValuesSorted(
          'Email communication preferences',
          SORT_DIRECTIONS.DESCENDING,
        );

        // Step 21: Click on "Submission date" column name once
        PatronPreRegistrationRecords.clickColumnHeader('Submission date');
        PatronPreRegistrationRecords.verifyColumnSortDirection(
          'Submission date',
          SORT_DIRECTIONS.ASCENDING,
        );
        PatronPreRegistrationRecords.verifyColumnValuesSorted(
          'Submission date',
          SORT_DIRECTIONS.ASCENDING,
        );

        // Step 22: Click on "Submission date" column name once again
        PatronPreRegistrationRecords.clickColumnHeader('Submission date');
        PatronPreRegistrationRecords.verifyColumnSortDirection(
          'Submission date',
          SORT_DIRECTIONS.DESCENDING,
        );
        PatronPreRegistrationRecords.verifyColumnValuesSorted(
          'Submission date',
          SORT_DIRECTIONS.DESCENDING,
        );

        // Step 23: Click on "Email Verification" column name once
        PatronPreRegistrationRecords.clickColumnHeader(emailVerificationColumn);
        PatronPreRegistrationRecords.verifyColumnSortDirection(
          emailVerificationColumn,
          SORT_DIRECTIONS.ASCENDING,
        );
        PatronPreRegistrationRecords.verifyColumnValuesSorted(
          emailVerificationColumn,
          SORT_DIRECTIONS.ASCENDING,
        );

        // Step 24: Click on "Email Verification" column name once again
        PatronPreRegistrationRecords.clickColumnHeader(emailVerificationColumn);
        PatronPreRegistrationRecords.verifyColumnSortDirection(
          emailVerificationColumn,
          SORT_DIRECTIONS.DESCENDING,
        );
        PatronPreRegistrationRecords.verifyColumnValuesSorted(
          emailVerificationColumn,
          SORT_DIRECTIONS.DESCENDING,
        );

        // Step 25: Click on "Action" column name
        PatronPreRegistrationRecords.getVisibleFirstNames().then((currentFirstNames) => {
          PatronPreRegistrationRecords.clickActionHeader();
          PatronPreRegistrationRecords.verifyVisibleFirstNames(currentFirstNames);
        });
        PatronPreRegistrationRecords.verifyColumnIsSortable('Action', false);
      },
    );
  });
});
