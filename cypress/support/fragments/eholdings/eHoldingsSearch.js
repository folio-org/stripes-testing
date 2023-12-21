import { Button, Section } from '../../../../interactors';

const searchPane = Section({ id: 'search-pane' });
const searchResultsSection = Section({ id: 'search-results' });

const filterSections = {
  // Common filters
  tags: searchPane.find(Section({ id: 'accordionTagFilter' })),
  sortOptions: searchPane.find(Section({ id: 'filter-providers-sort' })),
  // Packages filters
  packagesSelected: searchPane.find(Section({ id: 'filter-packages-selected' })),
  packagesTypes: searchPane.find(Section({ id: 'filter-packages-type' })),
  // Titles filters
  titlesSelected: searchPane.find(Section({ id: 'filter-titles-selected' })),
  titlesTypes: searchPane.find(Section({ id: 'filter-titles-type' })),
};

const filterLabels = {
  Tags: filterSections.tags,
  'Sort options': filterSections.sortOptions,
};

export default {
  waitLoading() {
    cy.expect(searchPane.exists());
  },
  checkSearchPaneContent({ filters = [] } = {}) {
    filters.forEach(({ label, visible }) => {
      if (visible) {
        cy.expect(filterLabels[label].exists());
      } else {
        cy.expect(filterLabels[label].absent());
      }
    });
  },
  switchToProviders() {
    cy.do(Button({ id: 'providers-tab' }).click());
    cy.expect(searchResultsSection.has({ title: 'Providers' }));
  },
  switchToTitles() {
    cy.do(Button({ id: 'titles-tab' }).click());
    cy.expect(searchResultsSection.has({ title: 'Titles' }));
  },
  switchToPackages() {
    cy.do(Button({ id: 'packages-tab' }).click());
    cy.expect(searchResultsSection.has({ title: 'Packages' }));
  },
};
