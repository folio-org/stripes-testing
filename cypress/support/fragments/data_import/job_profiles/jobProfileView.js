import { HTML, including } from '@interactors/html';
import {
  Accordion,
  Button,
  Callout,
  Link,
  Modal,
  MultiColumnList,
  MultiColumnListCell,
  MultiColumnListRow,
  MultiSelect,
  MultiSelectOption,
  Pane,
  ValueChipRoot,
} from '../../../../../interactors';

const viewPane = Pane({ id: 'view-job-profile-pane' });
const resultsPane = Pane({ id: 'pane-results' });
const actionsButton = Button('Actions');
const tagSelect = MultiSelect({ id: 'input-tag' });
const addTagForSelectOption = MultiSelectOption(including('Add tag for:'));
const jobProfilesList = MultiColumnList({ id: 'job-profiles-list' });

function waitLoading() {
  // wait for the page to be fully loaded
  cy.wait(2000);
}

export default {
  waitLoading,
  edit: () => {
    waitLoading();
    cy.do(viewPane.find(actionsButton).click());
    waitLoading();
    cy.do(Button('Edit').click());
  },
  duplicate: () => {
    cy.wait(2000);
    cy.do(viewPane.find(actionsButton).click());
    cy.do(Button('Duplicate').click());
    cy.wait(1000);
  },
  delete: () => {
    cy.do([
      viewPane.find(actionsButton).click(),
      Button('Delete').click(),
      Modal({ id: 'delete-job-profile-modal' })
        .find(Button({ id: 'clickable-delete-job-profile-modal-confirm' }))
        .click(),
    ]);
  },

  addExistingTag: (tag) => {
    cy.wait(1500);
    cy.do(Accordion({ id: 'tag-accordion' }).clickHeader());
    cy.expect(tagSelect.exists());
    cy.wait(1000);
    cy.do(tagSelect.choose(tag));
  },

  addNewTag: (newTag) => {
    cy.expect(tagSelect.exists());
    cy.get('#input-tag-input').type(newTag);
    cy.expect(addTagForSelectOption.exists());
    cy.do(addTagForSelectOption.click());
  },

  removeTag: (tag) => {
    cy.do(
      ValueChipRoot(tag)
        .find(Button({ icon: 'times' }))
        .click(),
    );
    cy.wait(500);
    cy.expect(ValueChipRoot(tag).absent());
    cy.wait(500);
  },

  verifyJobProfileOpened: () => {
    cy.expect(resultsPane.exists());
    cy.expect(viewPane.exists());
  },
  verifyAssignedTags: (tag, quantityOfTags = 1) => {
    cy.expect(MultiSelect({ selectedCount: quantityOfTags }).exists());
    cy.expect(ValueChipRoot(tag).exists());
    cy.expect(
      resultsPane
        .find(jobProfilesList)
        .find(MultiColumnListCell({ row: 0, columnIndex: 1, content: including(tag) }))
        .exists(),
    );
  },
  verifyAssignedTagsIsAbsent: (tag, quantityOfTags = 1) => {
    cy.expect(MultiSelect({ selectedCount: quantityOfTags }).exists());
    cy.expect(ValueChipRoot(tag).absent());
    cy.expect(
      resultsPane
        .find(jobProfilesList)
        .find(MultiColumnListCell({ row: 0, columnIndex: 2, content: including(tag) }))
        .absent(),
    );
  },
  verifyCalloutMessage: (message) => {
    cy.expect(Callout({ textContent: including(message) }).exists());
    cy.do(
      Callout()
        .find(Button({ icon: 'times' }))
        .click(),
    );
  },
  verifyJobProfileName: (profileName) => cy.expect(viewPane.find(HTML(including(profileName))).exists()),
  verifyActionMenuAbsent: () => cy.expect(viewPane.find(actionsButton).absent()),
  getLinkedProfiles: () => {
    waitLoading();
    const profileNames = [];

    return cy
      .get('[data-test-profile-link]')
      .each(($element) => {
        cy.wrap($element)
          .invoke('text')
          .then((name) => {
            profileNames.push(name);
          });
      })
      .then(() => {
        return profileNames;
      });
  },

  verifyLinkedProfiles(arrayOfProfileNames, numberOfProfiles) {
    waitLoading();
    if (numberOfProfiles === 0) {
      cy.get('[id*="branch-ROOT-MATCH"]').should('not.exist');
      cy.expect(Accordion('Overview').has({ content: including('This list contains no items') }));
    } else {
      const profileNames = [];

      cy.get('[data-test-profile-link]')
        .each(($element) => {
          cy.wrap($element)
            .invoke('text')
            .then((name) => {
              profileNames.push(name);
            });
        })
        .then(() => {
          // Iterate through each element in profileNames
          for (let i = 0; i < profileNames.length; i++) {
            expect(profileNames[i]).to.include(arrayOfProfileNames[i]);
          }
          expect(numberOfProfiles).to.equal(profileNames.length);
        });
    }
  },

  verifyLinkedProfilesForMatches(arrayOfProfileNames, numberOfProfiles) {
    waitLoading();
    if (numberOfProfiles === 0) {
      cy.get('[id*="branch-ROOT-MATCH"]').should('not.exist');
      cy.get('[id^="accordion-match-ROOT-editable"]').each(($element) => {
        cy.wrap($element)
          .invoke('text')
          .then((text) => {
            const initialText = text.slice(11, 41);
            expect(initialText).to.equal('This section contains no items');
          });
      });
    } else {
      const profileNames = [];

      cy.get('[id*="branch-ROOT-MATCH"]')
        .each(($element) => {
          cy.wrap($element)
            .invoke('text')
            .then((name) => {
              profileNames.push(name);
            });
        })
        .then(() => {
          // Iterate through each element in profileNames
          for (let i = 0; i < profileNames.length; i++) {
            expect(profileNames[i]).to.include(arrayOfProfileNames[i]);
          }

          expect(numberOfProfiles).to.equal(profileNames.length);
        });
    }
  },

  verifyLinkedProfilesForNonMatches(arrayOfProfileNames, numberOfProfiles) {
    waitLoading();
    const profileNames = [];

    cy.get('[id*="branch-ROOT-NON_MATCH"]')
      .each(($element) => {
        cy.wrap($element)
          .invoke('text')
          .then((name) => {
            profileNames.push(name);
          });
      })
      .then(() => {
        // Iterate through each element in profileNames
        for (let i = 0; i < profileNames.length; i++) {
          expect(profileNames[i]).to.include(arrayOfProfileNames[i]);
        }
        expect(numberOfProfiles).to.equal(profileNames.length);
      });
  },

  verifyNoLinkedProfiles() {
    cy.get('[data-test-profile-link]').should('not.exist');
  },

  verifyJobsUsingThisProfileSection(fileName) {
    const newFileName = fileName.replace('.mrc', '');
    cy.do(
      Accordion('Jobs using this profile')
        .find(MultiColumnListCell({ content: including(newFileName) }))
        .perform((element) => {
          const rowNumber = element.parentElement.parentElement.getAttribute('data-row-index');

          cy.expect(
            viewPane
              .find(MultiColumnListRow({ rowIndexInParent: rowNumber }))
              .find(MultiColumnListCell({ columnIndex: 0 }))
              .find(Link({ href: including('/data-import/job-summary/') }))
              .exists(),
          );
        }),
    );
  },
  // open the new tab in the current tab
  openLogDetailsPageView(fileName) {
    const newFileName = fileName.replace('.mrc', '');
    cy.get('#view-job-profile-pane')
      .find('*[class^="mclCell"]')
      .contains(newFileName)
      .invoke('removeAttr', 'target')
      .click();
  },

  openLinkedProfileById: (id) => {
    cy.wait(2000);
    cy.do(viewPane.find(Link({ href: including(`${id}`) })).click());
  },
};
