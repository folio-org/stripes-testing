import { randomFourDigitNumber } from '../../support/utils/stringTools';
import { DevTeams, Permissions, TestTypes } from '../../support/dictionary';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';

describe('Create new MARC bib', () => {
  const testData = {};

  before('Create test data', () => {});

  after('Delete test data', () => {
    /* delete all test objects created in precondition if possible */
  });

  it(
    'C380736 Search created "MARC bib" record by Title, OCLC number (spitfire) (null)',
    { tags: [TestTypes.criticalPath, DevTeams.spitfire] },
    () => {
      // #1 Click on "Actions" button in second pane → Select "+New MARC Bib Record" option
      // A new pane with title "Create a new MARC bib record" is opened
      // #2 Fill "$a" value in "245" field
      // (for example, input "Sophisticated title #1")
      // Filled value is shown in updated field
      // #3 Replace blank values in LDR positions 06, 07 with valid values
      // (for example, input "a" for both)
      // * Filled values are shown in updated LDR
      // * Boxes filled with "\" are appeared in "008" field
      // #4 Click on the "+" (Add a new field) icon next to any field
      // A new empty row appeared under the current one
      // #5 * Fill in the first (tag) box of created row with "035" MARC tag value
      // * Add value to "$a" in fourth box of created field (e.g., "$a (OCoLC)ocn607TST001")
      // The entered values are displayed in created field
      // #6 Click on the "Save & close" button
      // * Success toast notification is shown
      // * "Create a new MARC bib record" pane is closed
      // * Detail view for created record is opened in third pane
      // #7 In "Search & filter" pane:
      // * select "Instance" in toggle
      // * select "Keyword (title, contributor, identifier, HRID, UUID)" search option
      // * Input value from "035 $a" of created record in search input field (for example "(OCoLC)ocn607TST001")
      // * Click "Search"
      // Created record is shown in search results in second pane (for example, record with title "Sophisticated title #1")
      // #8 In "Search & filter" pane:
      // * select "OCLC number, normalized" search option
      // * Click "Search"
      // Created record is shown in search results in second pane (for example, record with title "Sophisticated title #1")
      // #9 In "Search & filter" pane:
      // * select "Keyword (title, contributor, identifier, HRID, UUID)" search option
      // * Input value from "245 $a" of created record in search input field (for example "Sophisticated title #1")
      // * Click "Search"
      // Created record is shown in search results in second pane (for example, record with title "Sophisticated title #1")
      // #10 In second pane, click on the title equal to "245 $a" of created record
      // (for example "Sophisticated title #1")
      // Detail view for created record is shown in third pane (for example, "Sophisticated title #1")
    },
  );
});
