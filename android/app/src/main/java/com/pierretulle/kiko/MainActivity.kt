package com.pierretulle.kiko

import expo.modules.splashscreen.SplashScreenManager

import android.os.Build
import android.os.Bundle

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    // Pour expo-splash-screen : enregistrez l'activité
    SplashScreenManager.registerOnActivity(this)
    super.onCreate(null)
  }

  /**
   * Renvoie le nom du composant principal enregistré depuis JavaScript.
   */
  override fun getMainComponentName(): String = "main"

  /**
   * Renvoie une instance de ReactActivityDelegate.
   * Ici, nous utilisons ReactActivityDelegateWrapper et DefaultReactActivityDelegate pour supporter la nouvelle architecture.
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
      this,
      BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
      object : DefaultReactActivityDelegate(
        this,
        mainComponentName,
        fabricEnabled
      ) {}
    )
  }

  /**
   * Personnalisation du comportement du bouton "retour" sur Android.
   */
  override fun invokeDefaultOnBackPressed() {
    if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
      if (!moveTaskToBack(false)) {
        // Pour les activités non racines, on utilise le comportement par défaut.
        super.invokeDefaultOnBackPressed()
      }
      return
    }
    // Sur Android S et versions ultérieures, on utilise le comportement par défaut.
    super.invokeDefaultOnBackPressed()
  }
}
