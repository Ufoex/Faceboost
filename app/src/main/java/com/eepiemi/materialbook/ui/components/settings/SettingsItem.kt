package com.eepiemi.materialbook.ui.components.settings

import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.KeyboardArrowRight
import androidx.compose.material.icons.filled.ExpandMore
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.eepiemi.materialbook.R
import androidx.compose.ui.util.fastForEachIndexed

data class SettingsItem(
    val icon: ImageVector,
    val title: String,
    val supportingText: String? = null,
    val isActive: Boolean? = null,
    val onClick: () -> Unit,
)

@Composable
fun SettingsItem(
    modifier: Modifier = Modifier,
    item: SettingsItem,
) {
    Row(
        modifier = modifier
            .background(color = MaterialTheme.colorScheme.surfaceContainer)
            .clickable { item.onClick() }
            .padding(horizontal = 24.dp, vertical = 16.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(16.dp)
    ) {
        Icon(
            imageVector = item.icon,
            tint = MaterialTheme.colorScheme.onSurface,
            contentDescription = null
        )

        Column(Modifier.weight(1f)) {
            Text(
                text = item.title,
                style = MaterialTheme.typography.titleMedium,
                color = MaterialTheme.colorScheme.onSurface
            )

            item.supportingText?.let {
                Text(
                    text = item.supportingText,
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
        }
        if (item.isActive != null) {
            Switch(
                checked = item.isActive,
                onCheckedChange = { item.onClick() },
                modifier = Modifier
            )
        } else {
            Icon(
                imageVector = Icons.AutoMirrored.Default.KeyboardArrowRight,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.secondary
            )
        }
    }
}


@Composable
fun SettingsGroup(
    items: List<SettingsItem>,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        items.fastForEachIndexed { index, item ->
            SettingsItem(
                item = item,
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(
                        when {
                            items.lastIndex == 0 -> {
                                RoundedCornerShape(28.dp)
                            }

                            index == 0 -> {
                                RoundedCornerShape(
                                    topStart = 28.dp,
                                    topEnd = 28.dp,
                                    bottomStart = 4.dp,
                                    bottomEnd = 4.dp
                                )
                            }

                            index == items.lastIndex -> {
                                RoundedCornerShape(
                                    topStart = 4.dp,
                                    topEnd = 4.dp,
                                    bottomStart = 28.dp,
                                    bottomEnd = 28.dp
                                )
                            }

                            else -> {
                                RoundedCornerShape(4.dp)
                            }
                        }
                    )
            )
        }
    }
}

/**
 * A titled category of settings that opens and closes on tap. Closed by default so the
 * screen is a short list of categories instead of one long scroll; the state survives
 * rotation and the dialog being reopened while the app runs.
 */
@Composable
fun SettingsSection(
    title: String,
    icon: ImageVector,
    items: List<SettingsItem>,
    modifier: Modifier = Modifier,
) {
    var expanded by rememberSaveable(title) { mutableStateOf(false) }
    val chevron by animateFloatAsState(if (expanded) 180f else 0f, label = "chevron")

    Column(
        modifier = modifier
            .fillMaxWidth()
            .animateContentSize(),
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(28.dp))
                .background(MaterialTheme.colorScheme.surfaceContainerHigh)
                .clickable { expanded = !expanded }
                .padding(horizontal = 20.dp, vertical = 14.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Box(
                modifier = Modifier
                    .size(40.dp)
                    .clip(CircleShape)
                    .background(MaterialTheme.colorScheme.primaryContainer),
                contentAlignment = Alignment.Center
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.onPrimaryContainer
                )
            }
            Column(Modifier.weight(1f)) {
                Text(
                    text = title,
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurface
                )
                Text(
                    text = stringResource(R.string.settings_cat_options, items.size),
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant
                )
            }
            Icon(
                imageVector = Icons.Default.ExpandMore,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.rotate(chevron)
            )
        }
        if (expanded) SettingsGroup(items = items)
    }
}
