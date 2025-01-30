const b = require('../build.js');

test('calcCronFreq(number, number)', () => {
    // the expected behaviour is that the resulting cron
    // frequency is rounded to the previous multiple of
    // the second arg supplied. which is the minimum cron span.
    // these values are in minutes.
    expect(() => b.calcCronFreq(0, 5)).toThrow();
    expect(() => b.calcCronFreq(-2, 3)).toThrow();
    expect(() => b.calcCronFreq(20, 0)).toThrow();
    expect(() => b.calcCronFreq(20, 61)).toThrow();
    expect(b.calcCronFreq(1, 5)).toBe(1440);
    expect(b.calcCronFreq(2, 5)).toBe(720);
    expect(b.calcCronFreq(3, 5)).toBe(480);
    expect(b.calcCronFreq(4, 5)).toBe(360);
    expect(b.calcCronFreq(5, 5)).toBe(285);
    expect(b.calcCronFreq(6, 5)).toBe(240);
    expect(b.calcCronFreq(7, 5)).toBe(205);
    expect(b.calcCronFreq(8, 5)).toBe(180);
    expect(b.calcCronFreq(62, 5)).toBe(20);
    expect(b.calcCronFreq(63, 5)).toBe(20);
    expect(b.calcCronFreq(64, 5)).toBe(20);
    expect(b.calcCronFreq(65, 5)).toBe(20);
    expect(b.calcCronFreq(66, 5)).toBe(20);
    expect(b.calcCronFreq(67, 5)).toBe(20);
    expect(b.calcCronFreq(68, 5)).toBe(20);
    expect(b.calcCronFreq(69, 5)).toBe(20);
    expect(b.calcCronFreq(70, 5)).toBe(20);
    expect(b.calcCronFreq(71, 5)).toBe(20);
    expect(b.calcCronFreq(72, 5)).toBe(20);
    expect(b.calcCronFreq(73, 5)).toBe(15);
    expect(b.calcCronFreq(74, 5)).toBe(15);
    expect(b.calcCronFreq(75, 5)).toBe(15);
    expect(b.calcCronFreq(76, 5)).toBe(15);
    expect(b.calcCronFreq(77, 5)).toBe(15);
    expect(() => b.calcCronFreq(1440, 5)).toThrow();
    expect(() => b.calcCronFreq(480, 5)).toThrow();
    expect(() => b.calcCronFreq(480, 5)).toThrow();
});

test('parseCronStringToMinutes(string)', () => {
    expect(b.parseCronStringToMinutes('* * * * *')).toBe(1);
    expect(b.parseCronStringToMinutes('*/5 * * * *')).toBe(5);
    expect(b.parseCronStringToMinutes('*/59 * * * *')).toBe(59);
    expect(() => b.parseCronStringToMinutes('*/60 * * * *'))
        .toThrow();
});

test('convertMinutesToCronString(number)', () => {
    expect(b.convertMinutesToCronString(1))
        .toBe('* * * * *');
    expect(b.convertMinutesToCronString(2))
        .toBe('*/2 * * * *');
    expect(b.convertMinutesToCronString(60))
        .toBe('* * * * *');
    expect(b.convertMinutesToCronString(70))
        .toBe('*/10 * * * *');
});
