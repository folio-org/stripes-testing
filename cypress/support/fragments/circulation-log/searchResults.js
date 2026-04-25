import { matching } from '@interactors/html';
import {
  MultiColumnList,
  MultiColumnListCell,
  Link,
  MultiColumnListHeader,
  including,
  MultiColumnListRow,
  Button,
  DropdownMenu,
} from '../../../../interactors';

const resultTable = MultiColumnList({ id: 'circulation-log-list' });
const descriptionDatePattern =
  /Due date:\s(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}(?:Z|[+-]\d{4}))/;

const parseIsoLikeDescriptionDate = (value) => {
  const [, year, month, day, hour, minute, second, milliseconds, timezoneOffset] = value.match(
    /(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})(Z|[+-]\d{4})/,
  );

  const utcTimestamp = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second),
    Number(milliseconds),
  );

  if (timezoneOffset === 'Z') {
    return utcTimestamp;
  }

  const offsetSign = timezoneOffset.startsWith('+') ? 1 : -1;
  const offsetHours = Number(timezoneOffset.slice(1, 3));
  const offsetMinutes = Number(timezoneOffset.slice(3, 5));
  const totalOffsetMinutes = offsetSign * (offsetHours * 60 + offsetMinutes);

  return utcTimestamp - totalOffsetMinutes * 60 * 1000;
};

export default {
  clickOnCell(content, row) {
    cy.do(MultiColumnListCell({ content, row }).find(Link()).click());
  },

  checkTableWithoutLinks() {
    cy.expect(resultTable.find(Link()).absent());
  },

  checkTableWithoutColumns(columns) {
    return cy.wrap(Object.values(columns)).each((columnToCheck) => {
      cy.expect(
        resultTable.find(MultiColumnListHeader({ content: including(columnToCheck) })).absent(),
      );
    });
  },

  chooseActionByRow(rowIndex, actionName) {
    cy.do([
      MultiColumnListRow({ indexRow: `row-${rowIndex}` })
        .find(Button({ icon: 'ellipsis' }))
        .click(),
      DropdownMenu().find(Button(actionName)).click(),
    ]);
  },

  verifyActionIconBorder(rowIndex) {
    cy.expect(
      MultiColumnListRow({ indexRow: `row-${rowIndex}` })
        .find(Button({ icon: 'ellipsis' }))
        .exists(),
    );
  },

  checkDescriptionDueDateWithinDrift(rowIndex, expectedDescriptionDueDate, allowedDriftMinutes) {
    cy.wrap(MultiColumnListCell({ row: Number(rowIndex), columnIndex: 7 }).text()).then(
      (description) => {
        const descriptionDateMatch = description.match(descriptionDatePattern);

        expect(description).to.include('Due date:');
        expect(descriptionDateMatch).to.not.equal(null);

        const actualDescriptionDueDate = descriptionDateMatch[1];
        const dueDateDriftMinutes =
          Math.abs(
            parseIsoLikeDescriptionDate(actualDescriptionDueDate) -
              parseIsoLikeDescriptionDate(expectedDescriptionDueDate),
          ) /
          (1000 * 60);

        expect(dueDateDriftMinutes).to.be.at.most(allowedDriftMinutes);
      },
    );
  },

  getBilledDate(rowIndex) {
    const dateRegEx = /\d{1,2}\/\d{1,2}\/\d{4},\s\d{1,2}:\d{2}\s\w{2}/gm;
    // Locate the cell with matching content
    const cell = MultiColumnListRow({ indexRow: `row-${rowIndex}` }).find(
      MultiColumnListCell({ content: matching(dateRegEx) }),
    );
    return cy
      .wrap(cell)
      .invoke('content')
      .then((content) => content);
  },
};
