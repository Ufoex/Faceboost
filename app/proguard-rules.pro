# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

-dontwarn org.slf4j.impl.StaticLoggerBinder
# WorkManager ("Facebook notifications") opens its Room database by reflection, through the
# generated WorkDatabase_Impl's no-argument constructor. R8's full mode keeps a class named by
# a bare -keep rule but not its constructors, so without this the release build crashed at
# launch (androidx.startup initializes WorkManager): NoSuchMethodException WorkDatabase_Impl.<init>.
-keep class * extends androidx.room.RoomDatabase {
    <init>();
}
