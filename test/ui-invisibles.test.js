import { renderInvisiblesString } from '../js/ui/invisibles.js';

describe('renderInvisiblesString', () => {
  it('returns empty string for empty input', () => {
    assert.equal(renderInvisiblesString(''), '');
  });

  it('renders markers for spaces and newlines, passing tabs through unchanged', () => {
    assert.equal(renderInvisiblesString('a b\tc\n'), 'a·b\tc¶\n');
  });

  it('renders marker-only output for whitespace input', () => {
    assert.equal(renderInvisiblesString(' \t\n'), '·\t¶\n');
  });
});
