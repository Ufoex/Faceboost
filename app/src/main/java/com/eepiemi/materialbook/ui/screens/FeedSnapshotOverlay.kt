package com.eepiemi.materialbook.ui.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.unit.dp

private val FacebookBlue = Color(0xFF1877F2)

/**
 * The last feed's picture (see FeedSnapshot) in the place of the page: top aligned and scaled to the width, so a slightly
 * different height only crops or leaves black at the bottom. It takes the touches (what it shows is not the live page), so it
 * says it is loading: a bar sweeping along the top and a spinner at the bottom, or the app would look frozen.
 */
@Composable
fun FeedSnapshotOverlay(snapshot: ImageBitmap, modifier: Modifier = Modifier) {
    Box(modifier.background(Color.Black).clipToBounds().pointerInput(Unit) {}) {
        Image(
            bitmap = snapshot,
            contentDescription = null,
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.FillWidth,
            alignment = Alignment.TopCenter
        )
        LinearProgressIndicator(
            modifier = Modifier.fillMaxWidth().align(Alignment.TopCenter),
            color = FacebookBlue,
            trackColor = Color.Transparent
        )
        Box(
            Modifier.align(Alignment.BottomCenter).padding(bottom = 36.dp).size(44.dp).background(Color(0xCC000000), CircleShape),
            contentAlignment = Alignment.Center
        ) {
            CircularProgressIndicator(Modifier.size(24.dp), color = Color.White, strokeWidth = 2.5.dp)
        }
    }
}
