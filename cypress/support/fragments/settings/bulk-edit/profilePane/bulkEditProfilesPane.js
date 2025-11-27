import {
  Button,
  Pane,
  PaneHeader,
  HTML,
  TextField,
  MultiColumnListRow,
  MultiColumnListCell,
  MultiColumnListHeader,
  Callout,
  including,
  or,
  matching,
} from '../../../../../../interactors';
import DateTools from '../../../../utils/dateTools';

const profilesPane = Pane(matching(/bulk edit profiles$/));
const newButton = Button('New');
const searchField = TextField('Search bulk edit profiles');
const profilesList = HTML({ className: including('profilesList-') });
const clearIcon = Button({ icon: 'times-circle-solid' });

export const COLUMN_NAMES = {
  NAME: 'Name',
  DESCRIPTION: 'Description',
  UPDATED: 'Updated',
  UPDATED_BY: 'Updated by',
  STATUS: 'Status',
};

const verifyTextColumnSorted = (selector, sortOrder, columnName) => {
  cy.get(selector).then(($elements) => {
    const textValues = Array.from($elements).map((el) => el.textContent.trim());

    const sortedValues = [...textValues].sort((a, b) => {
      if (sortOrder === 'ascending') {
        return a.localeCompare(b, undefined, { sensitivity: 'base' });
      } else {
        return b.localeCompare(a, undefined, { sensitivity: 'base' });
      }
    });

    expect(textValues).to.deep.equal(
      sortedValues,
      `${columnName} should be sorted in ${sortOrder} order`,
    );
  });
};

export default {
  verifyPaneElements() {
    cy.expect([
      profilesPane.exists(),
      profilesPane.find(PaneHeader({ subtitle: matching(/profiles? found/) })).exists(),
      searchField.exists(),
      profilesList.exists(),
      profilesList
        .find(HTML(or(including('End of list'), including('No profiles available.'))))
        .exists(),
    ]);
  },

  clickNewButton() {
    cy.do(newButton.click());
  },

  verifySuccessToast(actionType = 'created') {
    cy.expect(
      Callout({ type: 'success' }).has({ textContent: `Profile successfully ${actionType}.` }),
    );
  },

  verifyProfileInTable(name, description, userObject, isLocked = false) {
    const targetProfileRow = profilesList.find(
      MultiColumnListRow({ content: including(name), isContainer: false }),
    );

    cy.expect(
      targetProfileRow
        .find(MultiColumnListCell({ column: 'Name' }))
        .has({ content: including(name) }),
    );
    cy.expect(
      targetProfileRow
        .find(MultiColumnListCell({ column: 'Description' }))
        .has({ content: description }),
    );
    cy.expect(
      targetProfileRow.find(MultiColumnListCell({ column: 'Updated' })).has({
        content: DateTools.getFormattedDateWithSlashes({
          date: new Date(),
        }),
      }),
    );
    cy.expect(
      targetProfileRow.find(MultiColumnListCell({ column: 'Updated by' })).has({
        content: including(
          `${userObject.personal.lastName}, ${userObject.personal.firstName} ${userObject.personal.middleName || ''}`.trim(),
        ),
      }),
    );
    cy.expect(
      targetProfileRow.find(MultiColumnListCell({ column: 'Status' })).has({ content: 'Active' }),
    );

    if (isLocked) {
      cy.do(
        targetProfileRow.find(MultiColumnListCell({ column: 'Status' })).perform((el) => {
          cy.get(el).find('svg').should('have.class', 'icon-lock');
        }),
      );
    } else {
      cy.do(
        targetProfileRow.find(MultiColumnListCell({ column: 'Status' })).perform((el) => {
          cy.get(el).find('svg').should('not.exist');
        }),
      );
    }
  },

  clickProfileRow(profileName) {
    cy.do(
      profilesList
        .find(MultiColumnListRow({ content: including(profileName), isContainer: false }))
        .click(),
    );
  },

  verifyProfileNotInTable(profileName) {
    cy.expect(profilesList.find(MultiColumnListRow({ content: including(profileName) })).absent());
  },

  verifyProfileExistsInTable(profileName) {
    cy.expect(profilesList.find(MultiColumnListRow({ content: including(profileName) })).exists());
  },

  deleteBulkEditProfileByNameViaApi(name) {
    cy.getBulkEditProfile({ query: `name="${name}"` }).then((profile) => {
      if (profile.content && profile.content.length > 0) {
        const profileContent = profile.content[0];
        cy.deleteBulkEditProfile(profileContent.id, true);
      }
    });
  },

  verifyTableColumnsNames(
    expectedColumnsOrder = ['Name', 'Description', 'Updated', 'Updated by', 'Status'],
  ) {
    cy.get('[role=columnheader]').then(($headers) => {
      const actualColumnsOrder = $headers
        .map((index, header) => Cypress.$(header).text().trim())
        .get();

      expect(actualColumnsOrder).to.deep.eq(expectedColumnsOrder);
    });
  },

  verifyProfileCountMatchesDisplayedProfiles(type) {
    let entityType;

    switch (type) {
      case 'holdings':
        entityType = 'HOLDINGS_RECORD';
        break;
      case 'items':
        entityType = 'ITEM';
        break;
      case 'instances':
        entityType = 'INSTANCE';
        break;
      case 'marcInstances':
        entityType = 'INSTANCE_MARC';
        break;
      case 'users':
        entityType = 'USER';
        break;
      default:
        throw new Error(`Unsupported entity type: ${type}`);
    }

    cy.get('[class*="profilesList-"] [class^="mclRow-"]').then(($rows) => {
      const displayedCount = $rows.length;

      cy.getBulkEditProfile({ query: `entityType=${entityType}` }).then((profiles) => {
        const totalRecords = profiles.totalRecords;

        expect(displayedCount).to.equal(
          totalRecords,
          `Number of profiles displayed (${displayedCount}) should match totalRecords value (${totalRecords}) from the Settings`,
        );
      });
    });
  },

  verifyProfilesSortedByName(sortOrder = 'ascending') {
    cy.expect(MultiColumnListHeader({ id: 'list-column-name' }).has({ sort: sortOrder }));
    verifyTextColumnSorted(
      'div[class^="profilesList-"] [data-row-index] [class^="mclCell-"]:first-child [class^="label-"]',
      sortOrder,
      'Profile names',
    );
  },

  verifyProfilesSortedByUpdatedDate(sortOrder = 'ascending') {
    cy.expect(MultiColumnListHeader({ id: 'list-column-updateddate' }).has({ sort: sortOrder }));

    cy.get('div[class^="profilesList-"] [data-row-index] [class^="mclCell-"]:nth-child(3)').then(
      ($elements) => {
        const updatedDates = Array.from($elements).map((el) => el.textContent.trim());

        const sortedDates = [...updatedDates].sort((a, b) => {
          const dateA = new Date(a);
          const dateB = new Date(b);

          if (sortOrder === 'ascending') {
            return dateA - dateB;
          } else {
            return dateB - dateA;
          }
        });

        expect(updatedDates).to.deep.equal(
          sortedDates,
          `Updated dates should be sorted in ${sortOrder} order`,
        );
      },
    );
  },

  verifyProfilesSortedByUpdatedBy(sortOrder = 'ascending') {
    cy.expect(MultiColumnListHeader({ id: 'list-column-updatedby' }).has({ sort: sortOrder }));
    verifyTextColumnSorted(
      'div[class^="profilesList-"] [data-row-index] [class^="mclCell-"]:nth-child(4)',
      sortOrder,
      'Updated by names',
    );
  },

  changeSortOrderByName() {
    cy.do(Button({ id: 'clickable-list-column-name' }).click());
    cy.wait(1000);
  },

  changeSortOrderByUpdatedDate() {
    cy.do(Button({ id: 'clickable-list-column-updateddate' }).click());
    cy.wait(1000);
  },

  changeSortOrderByUpdatedBy() {
    cy.do(Button({ id: 'clickable-list-column-updatedby' }).click());
    cy.wait(1000);
  },

  searchProfile(profileName) {
    cy.do(searchField.fillIn(profileName));
    cy.expect(searchField.has({ value: profileName }));
    cy.wait(1000);
  },

  verifyClearSearchIconPresent() {
    cy.do(searchField.focus());
    cy.expect(searchField.find(clearIcon).exists());
  },

  verifySearchResultsHighlighted(searchTerm, columnName = 'Name') {
    cy.expect(
      profilesList
        .find(MultiColumnListCell({ column: columnName, highlightedText: searchTerm }))
        .exists(),
    );
  },

  verifyNumberOfFoundProfiles(expectedCount) {
    const subtitle =
      expectedCount === 1 ? `${expectedCount} profile found` : `${expectedCount} profiles found`;

    cy.expect(profilesPane.find(PaneHeader({ subtitle })).exists());

    if (expectedCount !== 0) {
      cy.get('[class*="profilesList-"] [class^="mclRow-"]').then(($rows) => {
        expect($rows.length).to.equal(
          expectedCount,
          `Number of profiles displayed (${$rows.length}) should match expected count (${expectedCount})`,
        );
      });
    }
  },

  clearSearch() {
    cy.do([searchField.focus(), searchField.find(clearIcon).click()]);
    cy.wait(2000);
  },

  verifyNoProfilesAvailable() {
    cy.expect(profilesList.find(HTML(including('No profiles available.'))).exists());
  },

  verifyColumnNotClickable(columnName) {
    const columnId = `list-column-${columnName.toLowerCase()}`;

    cy.get(`#${columnId}`).then(($element) => {
      const classList = $element.attr('class');

      expect(classList).to.not.include(
        'mclClickable-',
        `Column "${columnName}" should not have clickable class`,
      );
      expect(classList).to.not.include(
        'mclSortIndicator-',
        `Column "${columnName}" should not have sort indicator class`,
      );
    });
  },

  verifyColumnHasIcon(columnName) {
    const columnIdMap = {
      name: 'name',
      description: 'description',
      updated: 'updateddate',
      'updated by': 'updatedby',
      status: 'status',
    };

    const columnId = `list-column-${columnIdMap[columnName.toLowerCase()] || columnName.toLowerCase()}`;

    cy.get(`#${columnId}`)
      .find('[class^="mclHeaderInner-"]')
      .should(($el) => {
        const afterStyles = window.getComputedStyle($el[0], '::after');
        const backgroundImage = afterStyles.getPropertyValue('background-image');

        expect(backgroundImage).to.include('url');
      });
  },

  verifyHeaderUnderlined(columnName) {
    const columnIdMap = {
      name: 'name',
      description: 'description',
      updated: 'updateddate',
      'updated by': 'updatedby',
      status: 'status',
    };

    const columnId = `list-column-${columnIdMap[columnName.toLowerCase()] || columnName.toLowerCase()}`;

    cy.get(`#${columnId} [class^="mclHeaderInner-"]`).should(
      'have.css',
      'text-decoration-line',
      'underline',
    );
  },
};
