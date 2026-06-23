/**
 * SkillSegmented — Component tests
 * Verifies the three levels render and selecting one fires onChange with the
 * mapped skill_level value.
 */

import { fireEvent, render } from '@testing-library/react-native';

import { SkillSegmented } from '../SkillSegmented';

describe('SkillSegmented', () => {
  it('renders the three levels', () => {
    const { getByText } = render(
      <SkillSegmented value="intermediate" onChange={() => {}} />,
    );
    expect(getByText('Beginner')).toBeTruthy();
    expect(getByText('Intermediate')).toBeTruthy();
    expect(getByText('Advanced')).toBeTruthy();
  });

  it('fires onChange with the selected value', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <SkillSegmented value="intermediate" onChange={onChange} />,
    );
    fireEvent.press(getByText('Advanced'));
    expect(onChange).toHaveBeenCalledWith('advanced');
  });
});
