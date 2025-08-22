# Facial Recognition Test Suite

## Overview

This comprehensive test suite validates the facial recognition flow in your MatchFlow app, including permission handling, timer functionality, camera operations, photo capture, and error recovery mechanisms.

## Test Script Location

The test script is located at: `app/facial-recognition-test.tsx`

## How to Run the Tests

### Method 1: Direct Navigation
1. Open your MatchFlow app
2. Navigate to `/facial-recognition-test` in your browser or use deep linking on mobile
3. The test suite will load automatically

### Method 2: Add to Navigation (Recommended for Development)
Add a test button to your existing screens for easy access:

```tsx
import { router } from 'expo-router';

// Add this button to any screen
<TouchableOpacity onPress={() => router.push('/facial-recognition-test')}>
  <Text>Run Facial Recognition Tests</Text>
</TouchableOpacity>
```

### Method 3: Add to Settings Screen
You can add a link to the test suite in your settings screen for easy access during development.

## Test Suite Features

### 🧪 Comprehensive Test Coverage

The test suite includes 6 main test categories:

1. **Permission Denial Simulation**
   - Tests camera permission handling
   - Validates fallback behavior when permissions are denied
   - Ensures proper error messages and retry mechanisms

2. **Timer Functionality**
   - Tests 2-minute countdown timer
   - Validates start, pause, and reset functionality
   - Ensures timer state management is correct

3. **Camera Initialization**
   - Tests camera modal opening and closing
   - Validates camera ready state detection
   - Platform-specific handling (web vs native)

4. **Photo Capture Simulation**
   - Simulates capturing all three expressions (neutral, smile, sad)
   - Tests single image verification
   - Validates photo metadata handling

5. **Face Verification Process**
   - Tests complete face verification workflow
   - Validates verification scoring
   - Tests with mock photo data

6. **Error Recovery**
   - Tests various error scenarios
   - Validates state reset functionality
   - Ensures no crashes during error conditions

### 🎛️ Interactive Controls

- **Timer Controls**: Start, pause, and reset the verification timer
- **State Reset**: Clear all test data and reset to initial state
- **Individual Test Execution**: Run specific tests or the complete suite
- **Real-time Results**: Live updates of test progress and results

### 📊 Detailed Reporting

- **Test Status Indicators**: Visual icons showing pass/fail/running status
- **Execution Time**: Duration tracking for each test
- **Error Messages**: Detailed failure reasons and debugging information
- **Platform Information**: Shows current platform and permission status

## Test Instructions

### Before Running Tests

1. **Camera Permissions**: 
   - Grant camera permissions when prompted to test normal flow
   - Deny permissions to test fallback behavior
   - You can toggle permissions in device settings between tests

2. **Network Connection**: 
   - Ensure stable internet connection for image verification tests
   - Tests use sample images from Unsplash for verification

### Running the Tests

1. **Open the Test Suite**: Navigate to the facial recognition test screen
2. **Review Platform Info**: Check the platform and permission status at the bottom
3. **Run All Tests**: Click "Run All Tests" to execute the complete suite
4. **Monitor Progress**: Watch real-time updates in the results section
5. **Review Results**: Check detailed results and any error messages

### Individual Test Controls

- **Timer Controls**: Use play/pause/reset buttons to test timer functionality manually
- **State Reset**: Use "Reset State" to clear all data and start fresh
- **Platform-Specific**: Tests automatically adapt to web vs native platforms

## Expected Test Results

### ✅ Passing Scenarios

- **Permission Granted**: All tests should pass when camera permission is available
- **Web Platform**: Camera initialization should use ImagePicker fallback
- **Timer Functions**: Start, pause, and reset should work correctly
- **Photo Verification**: Mock photos should pass verification checks
- **State Management**: Reset should clear all data properly

### ⚠️ Expected Failures (Normal Behavior)

- **Permission Denied**: Permission tests will show proper fallback handling
- **Missing Dependencies**: Some tests may fail if required photos aren't captured first
- **Platform Limitations**: Web-specific limitations are handled gracefully

### 🚨 Actual Failures (Need Investigation)

- **Crashes**: No test should cause the app to crash
- **Infinite Loops**: Timer should not get stuck in running state
- **Memory Leaks**: State should be properly cleaned up
- **Unhandled Errors**: All errors should be caught and reported

## Debugging Failed Tests

### Common Issues and Solutions

1. **Timer Not Starting**
   - Check if there are multiple timer instances running
   - Verify timer cleanup in useEffect

2. **Camera Permission Issues**
   - Ensure proper permission request handling
   - Check platform-specific permission flows

3. **Photo Verification Failures**
   - Verify network connectivity for image loading
   - Check if face verification library is properly configured

4. **State Reset Not Working**
   - Ensure all state variables are included in reset function
   - Check for any persistent storage that needs clearing

### Test Result Interpretation

- **Green (Passed)**: Test completed successfully
- **Yellow (Running)**: Test is currently executing
- **Red (Failed)**: Test failed - check error message for details
- **Gray (Idle)**: Test hasn't been run yet

## Integration with CI/CD

The test suite can be integrated into automated testing workflows:

```bash
# Example: Run tests in headless mode (future enhancement)
npm run test:facial-recognition

# Or as part of E2E testing
npm run test:e2e -- --include-facial-recognition
```

## Customization

### Adding New Tests

To add new test scenarios, extend the test suite:

```tsx
// Add to the test functions array
const testNewScenario = useCallback(async () => {
  updateCurrentTest('New Scenario');
  testStartTimeRef.current = Date.now();
  
  try {
    addTestResult('New Scenario', 'running', 'Testing new scenario...');
    
    // Your test logic here
    
    addTestResult('New Scenario', 'passed', 'Test completed successfully', Date.now() - testStartTimeRef.current);
  } catch (error) {
    addTestResult('New Scenario', 'failed', `Test failed: ${error.message}`, Date.now() - testStartTimeRef.current);
  }
}, []);
```

### Modifying Test Parameters

You can adjust test parameters at the top of the file:

```tsx
// Adjust timer duration
const [timerSeconds, setTimerSeconds] = useState<number>(120); // Change to desired seconds

// Modify test delays
await new Promise(resolve => setTimeout(resolve, 800)); // Adjust delay as needed
```

## Troubleshooting

### Common Setup Issues

1. **Test Screen Not Loading**
   - Verify the file is in the correct location: `app/facial-recognition-test.tsx`
   - Check for TypeScript compilation errors
   - Ensure all imports are available

2. **Missing Dependencies**
   - Verify all required contexts are properly set up
   - Check that face verification library is installed
   - Ensure camera permissions are properly configured

3. **Platform-Specific Issues**
   - Web: Ensure browser supports required APIs
   - iOS: Check camera usage description in app.json
   - Android: Verify camera permissions in manifest

### Performance Considerations

- Tests use mock data to avoid excessive network requests
- Timer intervals are cleaned up properly to prevent memory leaks
- State updates are batched to avoid unnecessary re-renders

## Security Notes

- Test suite uses publicly available sample images
- No sensitive data is stored or transmitted
- Camera permissions are handled according to platform best practices
- All test data is cleared when tests complete

## Future Enhancements

Potential improvements to the test suite:

1. **Automated Test Execution**: Run tests automatically on app startup in development mode
2. **Test Report Export**: Save test results to file for analysis
3. **Performance Metrics**: Track memory usage and execution time
4. **Visual Regression Testing**: Compare UI screenshots across test runs
5. **Integration Testing**: Test interaction with backend services
6. **Stress Testing**: Test with rapid permission changes and edge cases

## Support

If you encounter issues with the test suite:

1. Check the console for detailed error messages
2. Verify all dependencies are properly installed
3. Ensure camera permissions are configured correctly
4. Test on different platforms (web, iOS, Android) to isolate platform-specific issues

The test suite is designed to be robust and provide clear feedback about the facial recognition flow's health and functionality.