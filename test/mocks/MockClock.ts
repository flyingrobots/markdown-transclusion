/**
 * Mock clock for controlling time in tests
 */
export class MockClock {
  private currentTime: number;
  private originalNow: () => number;
  private originalDate: DateConstructor;
  
  constructor(initialTime: number = 0) {
    this.currentTime = initialTime;
    this.originalNow = Date.now;
    this.originalDate = global.Date;
  }
  
  /**
   * Install the mock clock
   */
  install(): void {
    // Mock Date.now()
    Date.now = () => this.currentTime;
    
    // Mock Date constructor
    const mockClock = this;
    global.Date = class extends Date {
      constructor(...args: any[]) {
        if (args.length === 0) {
          super(mockClock.currentTime);
        } else if (args.length === 1) {
          super(args[0]);
        } else {
          // Handle multiple arguments
          super(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
        }
      }
      
      static now(): number {
        return mockClock.currentTime;
      }
    } as DateConstructor;
    
    // Copy static properties
    Object.setPrototypeOf(global.Date, this.originalDate);
    Object.getOwnPropertyNames(this.originalDate).forEach(prop => {
      if (prop !== 'prototype' && prop !== 'length' && prop !== 'name') {
        (global.Date as any)[prop] = (this.originalDate as any)[prop];
      }
    });
  }
  
  /**
   * Uninstall the mock clock
   */
  uninstall(): void {
    Date.now = this.originalNow;
    global.Date = this.originalDate;
  }
  
  /**
   * Advance time by milliseconds
   */
  tick(ms: number): void {
    this.currentTime += ms;
  }
  
  /**
   * Set the current time
   */
  setTime(time: number): void {
    this.currentTime = time;
  }
  
  /**
   * Get the current mocked time
   */
  getTime(): number {
    return this.currentTime;
  }
  
  /**
   * Run a function with mocked time
   */
  static withMockedTime<T>(
    fn: (clock: MockClock) => T,
    initialTime: number = 0
  ): T {
    const clock = new MockClock(initialTime);
    clock.install();
    try {
      return fn(clock);
    } finally {
      clock.uninstall();
    }
  }
  
  /**
   * Run an async function with mocked time
   */
  static async withMockedTimeAsync<T>(
    fn: (clock: MockClock) => Promise<T>,
    initialTime: number = 0
  ): Promise<T> {
    const clock = new MockClock(initialTime);
    clock.install();
    try {
      return await fn(clock);
    } finally {
      clock.uninstall();
    }
  }
}